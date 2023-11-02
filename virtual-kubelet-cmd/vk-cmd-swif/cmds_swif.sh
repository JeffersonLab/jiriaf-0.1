#!/bin/bash

# show wfs 
alias lswf="swif2 list"

# grep job_id from wf
function statwf { while true; do swif2 status $1 && sleep $2; done }

# delete wf
function delwf { swif2 cancel $1 -delete; }

#create wf
function genwf { swif2 import -file $1; }

#run wf 
function runwf { swif2 run $1; }

#slurm job details
# scontrol show jobid -dd $SLURM_JOB_ID