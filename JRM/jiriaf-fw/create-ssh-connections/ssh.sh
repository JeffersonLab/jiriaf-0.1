#!/bin/bash

curl -X POST -d "command=ssh -i ~/.ssh/nersc -J perlmutter -NfL 10001:localhost:10001 jlabtsai@128.55.64.13" http://172.17.0.1:8888/run

curl -X POST -d "command=ls -l" http://172.17.0.1:8888/run