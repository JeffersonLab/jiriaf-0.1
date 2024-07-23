#!/bin/bash

export grafana_data="/home/jeng-yuantsai/JIRIAF/prom-data/autoscaling-jiriaf/grafana-data"


docker run -d --net=host --user "$(id -u)"\
 --name=autoscale-grafa \
 --volume $grafana_data:/var/lib/grafana\
  grafana/grafana-enterprise

  ## Manually open port 3000 in vscode