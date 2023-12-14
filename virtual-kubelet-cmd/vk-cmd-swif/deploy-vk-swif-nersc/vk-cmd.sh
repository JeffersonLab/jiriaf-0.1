#!/bin/bash

export NODENAME="vk-swif-nersc"
export KUBECONFIG="/global/homes/j/jlabtsai/run-vk/kubeconfig/jiriaf2301"

ssh -i $HOME/.ssh/nersc -NfL 42053:localhost:42053 x3115c0s15b0n0

sh $HOME/docker_img/build-pipe.sh&

shifter --image=docker:jlabtsai/vk-cmd:v20231113 --entrypoint