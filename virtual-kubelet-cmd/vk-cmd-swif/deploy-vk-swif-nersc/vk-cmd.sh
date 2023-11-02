#!/bin/bash



ssh -NfL 42053:localhost:42053 login01

sh /global/homes/j/jlabtsai/docker_img/build-pipe.sh &

export NODENAME="vk-swif-nersc"
shifter --image=docker:jlabtsai/vk-cmd:latest --entrypoint