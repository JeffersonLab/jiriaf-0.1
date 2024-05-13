#!/bin/bash

## ssh tunnel

## name node
export NODENAME="vk"
export KUBECONFIG="$HOME/.kube/config" # the config file that is used to connect to the api-server. Usually it is located at $HOME/.kube/config
export VKUBELET_POD_IP="172.17.0.1" # the ip address of the node that is used to connect to the api-server. Usually it is the ip address of the docker0 interface if the api-server is running in a docker container 
export KUBELET_PORT="10260"

export JIRIAF_WALLTIME="0" # should be multiple of 60 and in seconds. if 0, then no walltime limit
export JIRIAF_NODETYPE="cpu"
export JIRIAF_SITE="mylin"

## run vk-cmd
### update the image to the latest version
export VK_CMD_IMAGE="jlabtsai/vk-cmd:main"
docker pull $VK_CMD_IMAGE

container_id=$(docker run -itd --rm --name vk-cmd $VK_CMD_IMAGE)
docker cp ${container_id}:/vk-cmd `pwd` && docker stop ${container_id}

cd `pwd`/vk-cmd

echo "=============================="

echo "api-server config: $KUBECONFIG; nodename: $NODENAME is runnning..."
echo "vk ip: $VKUBELET_POD_IP from view of metrics server; vk kubelet port: $KUBELET_PORT"
echo "walltime: $JIRIAF_WALLTIME; nodetype: $JIRIAF_NODETYPE; site: $JIRIAF_SITE"

./start.sh $KUBECONFIG $NODENAME $VKUBELET_POD_IP $KUBELET_PORT $JIRIAF_WALLTIME $JIRIAF_NODETYPE $JIRIAF_SITE
