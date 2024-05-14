#!/bin/bash

# Set up the environment variables
export nnodes=10
export nodetype="type"
export walltime="1:00:00"
export account="account"
export nodename="nodename"
export site="site"
export custom_metrics_ports=""

# Run the script
/fw/create_config.sh

# Check if the file was created
if [ ! -f /fw/node-config.yaml ]; then
    echo "The node-config.yaml file was not created."
    exit 1
fi

# Check if the file contains the correct content
if ! grep -q "nnodes: ${nnodes}" /fw/node-config.yaml; then
    echo "The nnodes variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "nodetype: ${nodetype}" /fw/node-config.yaml; then
    echo "The nodetype variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "walltime: ${walltime}" /fw/node-config.yaml; then
    echo "The walltime variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "account: ${account}" /fw/node-config.yaml; then
    echo "The account variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "nodename: ${nodename}" /fw/node-config.yaml; then
    echo "The nodename variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "site: ${site}" /fw/node-config.yaml; then
    echo "The site variable was not correctly set in the file."
    exit 1
fi
if ! grep -q "custom_metrics_ports:" /fw/node-config.yaml; then
    echo "The custom_metrics_ports variable was not correctly set in the file."
    exit 1
fi

echo "All tests passed."