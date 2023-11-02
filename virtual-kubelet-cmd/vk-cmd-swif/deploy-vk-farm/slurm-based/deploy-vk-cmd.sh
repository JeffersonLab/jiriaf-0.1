#!/bin/bash

# create tunnel from farm to jiriaf2301
## to make sure the tunnel is open, run "ssh -NfL 42053:localhost:42053 jiriaf2301.jlab.org" in the terminal ifarm1901
ssh -NfL 42053:localhost:42053 tsai@ifarm1901.jlab.org

# ssh -J ifarm1901.jlab.org -L 42053 tsai@jiriaf2301.jlab.org 

## run unix pipe
sh /home/tsai/vk-cmd/tools/pipeline/build_pipline_host.sh &

## name node
export NODENAME="vk-farm"

## run vk-cmd
apptainer run docker://jlabtsai/vk-cmd:latest