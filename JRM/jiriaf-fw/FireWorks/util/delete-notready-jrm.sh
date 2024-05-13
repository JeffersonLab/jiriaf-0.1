#!/bin/bash

# Get all nodes
nodes=$(kubectl get nodes --no-headers | awk '{print $1,$2}')

# Loop through each node
while read -r node; do
    name=$(echo $node | awk '{print $1}')
    status=$(echo $node | awk '{print $2}')

    # If the node is NotReady, delete it
    if [ "$status" == "NotReady" ]; then
        kubectl delete node $name
    fi
done <<< "$nodes"