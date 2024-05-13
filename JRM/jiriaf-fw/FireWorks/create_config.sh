#!/bin/bash

#!/bin/bash

# Check if each variable is set and print a message if it's not
if [ -z "$nnodes" ]; then
    echo "The nnodes variable is not set."
fi
if [ -z "$nodetype" ]; then
    echo "The nodetype variable is not set."
fi
if [ -z "$walltime" ]; then
    echo "The walltime variable is not set."
fi
if [ -z "$account" ]; then
    echo "The account variable is not set."
fi
if [ -z "$nodename" ]; then
    echo "The nodename variable is not set."
fi
if [ -z "$site" ]; then
    echo "The site variable is not set."
fi

# If any of the variables are not set, exit the script
if [ -z "$nnodes" ] || [ -z "$nodetype" ] || [ -z "$walltime" ] || [ -z "$account" ] || [ -z "$nodename" ] || [ -z "$site" ]; then
    exit 1
fi

cat << EOF > /fw/node-config.yaml
slurm:
    nnodes: ${nnodes}
    nodetype: ${nodetype}
    walltime: ${walltime}
    qos: debug
    account: ${account} #m4637 - jiriaf or m3792 - nersc

jrm:
    nodename: ${nodename}
    site: ${site}
    
    control_plane_ip: jiriaf2301
    apiserver_port: 35679
    kubeconfig: /global/homes/j/jlabtsai/config/kubeconfig
    vkubelet_pod_ip: "172.17.0.1"
    image: docker:jlabtsai/vk-cmd:main

ssh:
    remote_proxy: perlmutter
    remote: jlabtsai@128.55.64.13
EOF