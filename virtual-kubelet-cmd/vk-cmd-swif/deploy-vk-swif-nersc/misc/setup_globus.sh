#!/bin/bash

## Use this script at ifarm


export https_proxy="http://jprox.jlab.org:8082"

globus login --no-local-server

# swif2 log into the node tsai@swif-egress-21.jlab.org and then connect to ssh-agent there.