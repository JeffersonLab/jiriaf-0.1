#!/bin/bash

# if using swif2, cmd points to this file.

ssh -NfL 42053:localhost:42053 tsai@jiriaf2301.jlab.org
sh docker_img/build-pipe.sh &

export NODENAME="vk-swif-nersc"
shifter --image=docker:jlabtsai/vk-cmd:latest --entrypoint
