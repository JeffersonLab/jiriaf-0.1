#!/bin/bash

# Check if each variable is set and print a message if it's not
if [ -z "$nnodes" ]; then
    echo "The nnodes variable is not set."
    exit 1
fi
if [ -z "$nodetype" ]; then
    echo "The nodetype variable is not set."
    exit 1
fi
if [ -z "$walltime" ]; then
    echo "The walltime variable is not set."
    exit 1
fi
if [ -z "$account" ]; then
    echo "The account variable is not set."
    exit 1
fi
if [ -z "$nodename" ]; then
    echo "The nodename variable is not set."
    exit 1
fi
if [ -z "$site" ]; then
    echo "The site variable is not set."
    exit 1
fi

# Convert the space-separated string into a YAML list if it's set and not an empty string
if [ -n "$custom_metrics_ports" ] && [ "$custom_metrics_ports" != "" ]; then
    custom_metrics_ports_yaml=$(for port in $custom_metrics_ports; do echo "    - $port"; done)
    custom_metrics_ports_yaml="custom_metrics_ports: 
$custom_metrics_ports_yaml"
else
    custom_metrics_ports_yaml=""
fi

cat << EOF > /fw/node-config.yaml
slurm:
    nnodes: ${nnodes}
    nodetype: ${nodetype}
    walltime: ${walltime}
    qos: ${qos}
    account: ${account} #m4637 - jiriaf or m3792 - nersc

jrm:
    nodename: ${nodename}
    site: ${site}
    
    control_plane_ip: jiriaf2301
    apiserver_port: 35679
    kubeconfig: /global/homes/j/jlabtsai/config/kubeconfig
    vkubelet_pod_ip: "172.17.0.1"
    image: docker:jlabtsai/vk-cmd:main

    $custom_metrics_ports_yaml

ssh:
    remote_proxy: perlmutter
    remote: jlabtsai@128.55.64.13
EOF

cp /fw/node-config.yaml /fw/logs/${nodename}_node-config.yaml