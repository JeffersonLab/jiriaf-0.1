#!/bin/bash


export PROCESS_EXPORTER_IMG="jlabtsai/process-exporter:v0.2"
export PROCESS_EXPORTER_PORT="1911"


# docker run -d --rm -e PROCESS_EXPORTER_PORT=$PROCESS_EXPORTER_PORT -p $PROCESS_EXPORTER_PORT:$PROCESS_EXPORTER_PORT -v /proc:/host_proc $PROCESS_EXPORTER_IMG


ssh -NfR $PROCESS_EXPORTER_PORT:localhost:$PROCESS_EXPORTER_PORT mylin
shifter --image=$PROCESS_EXPORTER_IMG -V /proc:/host_proc --entrypoint