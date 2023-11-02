#!/bin/bash

export VK_PATH="/Users/jeng-yuantsai/Research/jlab/jiriaf/vk/virtual-kubelet-cmd/test-run/apiserver"
export VK_BIN="/Users/jeng-yuantsai/Research/jlab/jiriaf/vk/virtual-kubelet-cmd/bin"
export KUBECONFIG="$VK_PATH/config"
export VKUBELET_POD_IP="10.250.64.71"
export APISERVER_CERT_LOCATION="$VK_PATH/client.crt"
export APISERVER_KEY_LOCATION="$VK_PATH/client.key"
export KUBELET_PORT="10250"
export NODENAME="vk-mac"


echo "{\"$NODENAME\": {\"cpu\": \"0\", \"memory\": \"0Gi\", \"pods\": \"0\"}}" > $HOME/.host-cfg.json

"$VK_BIN/virtual-kubelet" --nodename $NODENAME --provider mock --provider-config $HOME/.host-cfg.json --log-level debug --klog.v 3 > ./vk.log 2>&1 