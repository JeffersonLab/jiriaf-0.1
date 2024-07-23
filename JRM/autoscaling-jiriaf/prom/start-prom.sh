#!/bin/bash

export prom_data="/home/jeng-yuantsai/JIRIAF/prom-data/autoscaling-jiriaf"
export prom_setting="/home/jeng-yuantsai/JIRIAF/autoscaling-jiriaf/prom"

docker run -d \
    --name autoscale-prom \
    --net=host \
    --user "$(id -u)" \
    -v $prom_setting:/prometheus \
    -v $prom_data/data:/prometheus/data \
    prom/prometheus --config.file=/prometheus/prometheus.yml --storage.tsdb.path=/prometheus/data --storage.tsdb.retention.time=720d


## Manually open port 9090 in vscode
