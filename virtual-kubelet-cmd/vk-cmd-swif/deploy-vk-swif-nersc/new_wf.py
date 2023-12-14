import subprocess

# read wf_config.yaml as a dictionary

import yaml

# Load YAML file as a dictionary
with open('wf_config.yaml', 'r') as f:
    wf_config = yaml.safe_load(f)

# Print the contents of the YAML file
print(wf_config)


wf_name = wf_config["wf_name"]
# since we have only one job in the workflow
wf_config = wf_config["jobs"][0]

# SLURM options
SBATCH  = ['-sbatch']
SBATCH += [f'--account={wf_config["slurm"]["project"]}']
# SBATCH += ['--volume="/global/project/projectdirs/%s/launch:/launch"' % PROJECT]
# SBATCH += ['--image=%s' % IMAGE]
SBATCH += ['-t', wf_config["slurm"]["walltime"]]
SBATCH += ['-N', wf_config["slurm"]["nodes"]]
# SBATCH += ['--tasks-per-node=1']
# SBATCH += ['--cpus-per-task=64']
SBATCH += ['-q', wf_config["slurm"]["queue"]]
SBATCH += ['-C', wf_config["slurm"]["constraint"]]
SBATCH += ['-o', 'job-%j.out']
SBATCH += ['-e', 'job-%j.err']


def create_wf():
    # Create workflow
    cmd =  ['swif2', 'create', '-workflow', wf_name]
    
    # Create site
    ## check site info: swif2 show-sites
    cmd += ['-site-name', wf_config["site"]["name"],
            "-site-path", wf_config["site"]["home_dir"],
            "-site-globus-endpoint", wf_config["site"]["globus_endpoint"],
            "-site-login-user", wf_config["site"]["login_user"],
            "-site-login-host", wf_config["site"]["login_host_addr"]
            ]

    print(f'create_wf cmd = {cmd}')
    subprocess.call(cmd)


def add_job():
# Command for job to run
    CMD = [wf_config["job"]["cmd_file"]]
    # CMD = [f'echo "Hello World" > {wf_config["site"]["home_dir"]}/hello.txt']

    # VK_CMD = '{ ssh -NfL 42053:localhost:42053 login01;'
    # VK_CMD += f' export NODENAME="{wf_config["job"]["vk_node_name"]}";'
    # VK_CMD += ' shifter --image=docker:jlabtsai/vk-cmd:latest --entrypoint; } & '

    # UNIX_PIPE_CMD = '{ sh /global/homes/j/jlabtsai/docker_img/build-pipe.sh; } &'
    # CMD = [VK_CMD + UNIX_PIPE_CMD]

    # Make swif2 command
    SWIF2_CMD  = ['swif2']
    SWIF2_CMD += ['add-job']
    SWIF2_CMD += ['-workflow', wf_name]
    SWIF2_CMD += ['-name', wf_config["job"]["vk_node_name"]]
    # SWIF2_CMD += ['-shell', '/bin/bash']

    
    
    # Add SBATCH options and actual command to run to swif2 command		
    SWIF2_CMD += SBATCH + ['::'] + CMD
    print(f'add_job cmd = {SWIF2_CMD}')
    subprocess.call(SWIF2_CMD)


def run_wf():
    # Run workflow
    cmd =  ['swif2', 'run', '-workflow', wf_name]
    print(f'run_wf cmd = {cmd}')
    subprocess.call(cmd)


if __name__ == "__main__":
    create_wf()
    add_job()
    run_wf()