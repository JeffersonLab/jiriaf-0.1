#!/bin/bash

export env_list="env.list"
export jrm_fw_tag="latest"
export logs="$HOME/jrm-launch/logs"

docker run -it --rm --name=jrm-fw -v $logs:/fw/logs --env-file $env_list jlabtsai/jrm-fw:$jrm_fw_tag $@