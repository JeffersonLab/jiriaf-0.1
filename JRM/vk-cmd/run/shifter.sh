#!/bin/bash

export CONTROL_PLANE_IP="jiriaf2301"
export APISERVER_PORT="43727"
export NODENAME="vk-nersc"
export KUBECONFIG="/global/homes/j/jlabtsai/run-vk/kubeconfig/$CONTROL_PLANE_IP"
export VKUBELET_POD_IP="172.17.0.1"
export KUBELET_PORT="10251"

export JIRIAF_WALLTIME="120" # should be multiple of 60 and in seconds. if 0, then no walltime limit
export JIRIAF_NODETYPE="gpu"
export JIRIAF_SITE="Local"

# check if ssh tunnel is running, if not, start it as a follow
if [ -z "$(ps -ef | grep $APISERVER_PORT | grep -v grep)" ]; then
    echo "Forwarding port $APISERVER_PORT to $CONTROL_PLANE_IP"
    ssh -NfL $APISERVER_PORT:localhost:$APISERVER_PORT $CONTROL_PLANE_IP
else
    echo "Forwarding port $APISERVER_PORT to $CONTROL_PLANE_IP is running"
fi


if [ -z "$(ps -ef | grep $KUBELET_PORT | grep -v grep)" ]; then
    echo "Reverse forwarding port $KUBELET_PORT to $CONTROL_PLANE_IP"
    ssh -NfR *:$KUBELET_PORT:localhost:$KUBELET_PORT $CONTROL_PLANE_IP
else
    echo "Reverse forwarding port $KUBELET_PORT to $CONTROL_PLANE_IP is running"
fi

## echo walltime, nodetype, site
echo "walltime: $JIRIAF_WALLTIME; nodetype: $JIRIAF_NODETYPE; site: $JIRIAF_SITE"

# ssh -NfL $APISERVER_PORT:localhost:$APISERVER_PORT $CONTROL_PLANE_IP
# ssh -NfR *:$KUBELET_PORT:localhost:$KUBELET_PORT $CONTROL_PLANE_IP 
# To make sure the port is open to all interfaces, one has to set GatewayPorts to yes in /etc/ssh/sshd_config and run sudo service ssh restart at mylin.

shifter --image=docker:jlabtsai/vk-cmd:main -- /bin/bash -c "cp -r /vk-cmd `pwd`"

cd `pwd`/vk-cmd

echo "api-server config: $KUBECONFIG; nodename: $NODENAME is runnning..."
echo "api-server interface is running at $VKUBELET_POD_IP; vk kubelet port: $KUBELET_POR"

./start.sh $KUBECONFIG $NODENAME $VKUBELET_POD_IP $KUBELET_PORT $JIRIAF_WALLTIME $JIRIAF_NODETYPE $JIRIAF_SITE