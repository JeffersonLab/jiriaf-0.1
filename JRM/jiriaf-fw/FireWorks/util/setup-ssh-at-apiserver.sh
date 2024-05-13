#!/bin/bash
# run this on login04

# run this on jiriaf2301 to login04 at nersc
export APISERVER_PORT="35679"
ssh -i ~/.ssh/nersc -J perlmutter -NfR $APISERVER_PORT:localhost:$APISERVER_PORT jlabtsai@128.55.64.13

# setup mongodb
ssh -i ~/.ssh/nersc -J perlmutter -NfR 27017:localhost:27017 jlabtsai@128.55.64.13

# setup ssh for the k8s metrics server. Run this on the apiserver. If use KinD, * is for the all interfaces.
ssh -i ~/.ssh/nersc -J perlmutter -NfL *:$KUBELET_PORT:localhost:$KUBELET_PORT jlabtsai@128.55.64.13
