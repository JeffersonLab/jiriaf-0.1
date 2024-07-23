#!/bin/bash

export VKUBELET_POD_IP=$3 
export APISERVER_CERT_LOCATION="client.crt"
export APISERVER_KEY_LOCATION="client.key"
export KUBELET_PORT=$4 #"10250"

export KUBECONFIG=$1
export NODENAME=$2

export JIRIAF_WALLTIME=$5
export JIRIAF_NODETYPE=$6
export JIRIAF_SITE=$7

./virtual-kubelet --kubeconfig $KUBECONFIG --nodename $NODENAME --provider mock --klog.v 3 > $2.log 2>&1