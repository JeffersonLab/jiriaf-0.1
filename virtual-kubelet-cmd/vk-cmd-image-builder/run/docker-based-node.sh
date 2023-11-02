#!/bin/bash

## ssh tunnel
ssh -NfL 42053:localhost:42053 tsai@jiriaf2301.jlab.org

## run unix pipe
sh ../tools/pipeline/build_pipline_host.sh &

## name node
export NODENAME="vk-lin"

## run vk-cmd
docker run -d -v $HOME/hostpipe:/root/hostpipe --network="host" -e NODENAME=$NODENAME jlabtsai/vk-cmd:latest