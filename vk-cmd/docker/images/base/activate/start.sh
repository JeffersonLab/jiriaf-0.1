#!/bin/bash

export VK_PATH="/vk-cmd"
export KUBECONFIG="$VK_PATH/config"
export VKUBELET_POD_IP="10.250.64.71"
export APISERVER_CERT_LOCATION="$VK_PATH/client.crt"
export APISERVER_KEY_LOCATION="$VK_PATH/client.key"
export KUBELET_PORT="10250"

echo "{\"$NODENAME\": {\"cpu\": \"0\", \"memory\": \"0Gi\", \"pods\": \"0\"}}" > $HOME/.host-cfg.json

"$VK_PATH/virtual-kubelet" --nodename $NODENAME --provider mock --provider-config $HOME/.host-cfg.json --klog.v 3 > $HOME/$NODENAME.log 2>&1