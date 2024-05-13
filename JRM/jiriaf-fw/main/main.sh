#!/bin/bash

export nnodes=4
export nodetype=cpu
export walltime=00:05:00 # this is the walltime for the slurm job and jrm walltime
export nodename=vk-nersc-test
export site=perlmutter
export account=m3792 # this is the account number for the allocation at NERSC

mkdir -p $HOME/jrm-launch/logs
export logs="$HOME/jrm-launch/logs"

docker run -it --rm --name=jrm-fw -v $logs:/fw/logs \
 -e nnodes=$nnodes -e nodetype=$nodetype \
  -e walltime=$walltime -e nodename=$nodename -e site=$site -e account=$account jlabtsai/jrm-fw:latest $@


