#!/bin/bash

export custom_metrics_ports=${custom_metrics_ports:-''}

export nnodes=${nnodes:-2}
export nodetype=${nodetype:-cpu}
export walltime=${walltime:-00:05:00} # this is the walltime for the slurm job and jrm walltime
export nodename=${nodename:-vk-nersc-test}
export site=${site:-perlmutter}
export account=${account:-m3792} # this is the account number for the allocation at NERSC
export qos="debug"

export ssh_key="$HOME/.ssh_nersc/nersc"
export ssh_remote="jlabtsai@128.55.64.13"
export ssh_remote_proxy="perlmutter" # To use this, make sure you have the ssh config setup

mkdir -p $HOME/jrm-launch/logs
export logs="$HOME/jrm-launch/logs"

docker run -it --rm --name=jrm-fw -v $logs:/fw/logs \
 -e nnodes=$nnodes -e nodetype=$nodetype \
  -e walltime=$walltime -e nodename=$nodename \
  -e qos=$qos \
   -e site=$site -e account=$account -e "custom_metrics_ports=$custom_metrics_ports" \
   -e ssh_key=$ssh_key -e ssh_remote=$ssh_remote -e "ssh_remote_proxy=$ssh_remote_proxy" \
   jlabtsai/jrm-fw:latest $@
