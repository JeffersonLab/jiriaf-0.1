#!/bin/bash

docker build -t jlabtsai/process-exporter:v1.0.0 --no-cache .
docker push jlabtsai/process-exporter:v1.0.0