from fireworks import Workflow, Firework, LaunchPad, ScriptTask, TemplateWriterTask
import time
from monty.serialization import loadfn
import textwrap
import socket, requests, json, logging

LPAD = LaunchPad.from_file('/fw/util/my_launchpad.yaml')

class Logger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        handler = logging.FileHandler(f'/fw/logs/{name}.log')
        handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def log(self, msg):
        self.logger.debug(msg)


class Slurm:
    def __init__(self, config_file="/fw/node-config.yaml"):
        self.node_config = loadfn(config_file) if config_file else {}
        if not self.node_config:
            raise ValueError("node-config.yaml is empty")
        self.nnode = self.node_config["slurm"]["nnodes"]
        self.qos = self.node_config["slurm"]["qos"]
        self.walltime = self.node_config["slurm"]["walltime"]
        self.account = self.node_config["slurm"]["account"]
        self.nodetype = self.node_config["slurm"]["nodetype"]

class Jrm:
    def __init__(self, config_file="/fw/node-config.yaml"):
        self.node_config = loadfn(config_file) if config_file else {}
        if not self.node_config:
            raise ValueError("node-config.yaml is empty")
        self.control_plane_ip = self.node_config["jrm"]["control_plane_ip"]
        self.apiserver_port = self.node_config["jrm"]["apiserver_port"]
        self.nodename = self.node_config["jrm"]["nodename"]
        self.kubeconfig = self.node_config["jrm"]["kubeconfig"]
        self.vkubelet_pod_ip = self.node_config["jrm"]["vkubelet_pod_ip"]
        self.site = self.node_config["jrm"]["site"]
        self.image = self.node_config["jrm"]["image"]

class Ssh:
    def __init__(self, config_file="/fw/node-config.yaml"):
        self.node_config = loadfn(config_file) if config_file else {}
        if not self.node_config:
            raise ValueError("node-config.yaml is empty")
        self.remote = self.node_config["ssh"]["remote"]
        self.remote_proxy = self.node_config["ssh"]["remote_proxy"]

    def send_command(self, command):
        url = "http://172.17.0.1:8888/run"
        data = {'command': command}
        response = requests.post(url, data=data)  # Use data instead of json
        if response.status_code == 200:
            response_text = response.text.replace('\n', '\\n')
            return json.loads(response_text)
        else:
            return None
        
    def request_available_port(self, start, end, ip="127.0.0.1"):
        url = f"http://172.17.0.1:8888/get_port/{ip}/{start}/{end}"
        response = requests.get(url)

        if response.status_code == 200:
            return response.json()
        else:
            return None
    
    def connect_db(self):
        # send the cmd to REST API server listening 8888
        cmd = f"ssh -i ~/.ssh/nersc -J {self.remote_proxy} -NfR 27017:localhost:27017 {self.remote}" 
        response = self.send_command(cmd)
        # write response to log
        logger = Logger('connect_db_logger')
        # add cmd to response for record
        response['cmd'] = cmd
        response["remote_proxy"] = self.remote_proxy
        response["remote"] = self.remote
        response["port"] = "27017"
        logger.log(response)
        return response


    def connect_apiserver(self, apiserver_port):
        # send the cmd to REST API server listening 8888
        cmd = f"ssh -i ~/.ssh/nersc -J {self.remote_proxy} -NfR {apiserver_port}:localhost:{apiserver_port} {self.remote}" 
        response = self.send_command(cmd)
        logger = Logger('connect_apiserver_logger')
        # add cmd to response for record
        response['cmd'] = cmd
        response["remote_proxy"] = self.remote_proxy
        response["remote"] = self.remote
        response["port"] = apiserver_port
        logger.log(response)
        return response
    
    def connect_metrics_server(self, kubelet_port, nodename):
        # send the cmd to REST API server listening 8888
        cmd = f"ssh -i ~/.ssh/nersc -J {self.remote_proxy} -NfL *:{kubelet_port}:localhost:{kubelet_port} {self.remote}" 
        response = self.send_command(cmd)
        logger = Logger('connect_metrics_server_logger')
        # add cmd to response for record
        response['cmd'] = cmd
        response["remote_proxy"] = self.remote_proxy
        response["remote"] = self.remote
        response["port"] = kubelet_port
        response["nodename"] = nodename
        logger.log(response)
        return response



class Task:
    def __init__(self, slurm_instance, jrm_instance, ssh_instance):
        self.slurm = slurm_instance
        self.jrm = jrm_instance
        self.ssh = ssh_instance

    def get_jrm_script(self, node_id, kubelet_port):
        # translate walltime to seconds, eg 01:00:00 -> 3600
        jrm_walltime = sum(int(x) * 60 ** i for i, x in enumerate(reversed(self.slurm.walltime.split(":"))))
        # jrm need 1 min to warm up. substract 1*60 from jrm_walltime.
        jrm_walltime -= 1 * 60

        nodename = f"{self.jrm.nodename}-{node_id}"

        script = textwrap.dedent(f"""
            #!/bin/bash

            export NODENAME={nodename}
            export KUBECONFIG={self.jrm.kubeconfig}
            export VKUBELET_POD_IP={self.jrm.vkubelet_pod_ip}
            export KUBELET_PORT={kubelet_port}
            export JIRIAF_WALLTIME={jrm_walltime}
            export JIRIAF_NODETYPE={self.slurm.nodetype}
            export JIRIAF_SITE={self.jrm.site}

            echo JRM: \$NODENAME is running on \$HOSTNAME
            echo Walltime: \$JIRIAF_WALLTIME, nodetype: \$JIRIAF_NODETYPE, site: \$JIRIAF_SITE

            ssh -NfL {self.jrm.apiserver_port}:localhost:{self.jrm.apiserver_port} {self.ssh.remote}
            ssh -NfR {kubelet_port}:localhost:{kubelet_port} {self.ssh.remote}

            shifter --image={self.jrm.image} -- /bin/bash -c "cp -r /vk-cmd `pwd`/{nodename}"
            cd `pwd`/{nodename}

            echo api-server: {self.jrm.apiserver_port}, kubelet: {kubelet_port}

            ./start.sh \$KUBECONFIG \$NODENAME \$VKUBELET_POD_IP \$KUBELET_PORT \$JIRIAF_WALLTIME \$JIRIAF_NODETYPE \$JIRIAF_SITE &

            # stop the processes after the walltim. this is essential for making sure the firework is completed.
            sleep \$JIRIAF_WALLTIME
            echo "Walltime \$JIRIAF_WALLTIME is up. Stop the processes."
            pkill -f "./start.sh"

        """)

        # Now, `script` contains the bash script with correct indentation.
        return script, nodename


def launch_jrm_script():
    slurm = Slurm()
    jrm = Jrm()
    ssh = Ssh()
    
    task = Task(slurm, jrm, ssh)

    # run db, apiserver ssh
    ssh_db = ssh.connect_db()
    ssh_apiserver = ssh.connect_apiserver(jrm.apiserver_port)

    tasks, nodenames, ssh_metrics, jrm_ports = [], [], [], []
    for _ in range(slurm.nnode):
        # unique timestamp for each node
        timestamp = str(int(time.time()))
        
        respons = ssh.request_available_port(10000, 19999)
        port = respons['port']
        jrm_ports.append(port)

        script, nodename = task.get_jrm_script(timestamp, port) # kubelet port starts from 10000; this is not good!
        nodenames.append(nodename)

        cmd = ssh.connect_metrics_server(port, nodename)
        ssh_metrics.append(cmd)
        print(f"Node {nodename} is running on port {port}")

        tasks.append(ScriptTask.from_str(f"cat << EOF > {nodename}.sh\n{script}\nEOF"))
        tasks.append(ScriptTask.from_str(f"chmod +x {nodename}.sh"))
        # sleep 5 second fo ssh to be ready
        time.sleep(5)

    exec_task = ScriptTask.from_str(f"for nodename in {' '.join(nodenames)}; do srun --nodes=1 sh $nodename.sh& done; wait; echo 'All nodes are done'")
    tasks.append(exec_task)

    fw = Firework(tasks, name=f"{jrm.site}_{nodename}")

    fw.spec["_category"] = jrm.site

    fw.spec["_queueadapter"] = {
        "job_name": f"{jrm.site}_{nodename}",
        "walltime": slurm.walltime,
        "qos": slurm.qos,
        "nodes": slurm.nnode,
        "account": slurm.account,
        "constraint": slurm.nodetype
        }
    
    fw.spec["jrms_info"] = {
        "nodenames": nodenames,
        "jrm_ports": jrm_ports,
        "apiserver_port": jrm.apiserver_port,
        "kubeconfig": jrm.kubeconfig,
        "control_plane_ip": jrm.control_plane_ip,
        "vkubelet_pod_ip": jrm.vkubelet_pod_ip,
        "site": jrm.site,
        "image": jrm.image,
    }

    fw.spec["ssh_info"] = {
        "ssh_metrics": ssh_metrics,
        "ssh_db": ssh_db,
        "ssh_apiserver": ssh_apiserver,
    }
    
    # preempt has min walltime of 2 hours (can get stop after 2 hours)
    # debug_preempt has max walltime of 30 minutes (can get stop after 5 minutes)
    wf = Workflow([fw], {fw: []})
    wf.name = f"{jrm.site}_{nodename}"
    return wf


def add_jrm():
    wf = launch_jrm_script()
    LPAD.add_wf(wf)
    print(f"Add workflow {wf.name} to LaunchPad")

if __name__ == "__main__":
    add_jrm()