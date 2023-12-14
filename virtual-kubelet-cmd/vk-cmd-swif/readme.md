# Running vk-cmd with SWIF2 at remote compute sites

## Introduction
This guide explains how to run `vk-cmd` in remote compute sites using the workflow tool SWIF2. To check the flags of SWIF2, please refer to the [SWIF2 documentation](https://scicomp.jlab.org/cli/swif.html).

## Setting up SWIF2 for running workflows at NERSC
1. Set up the Globus endpoint (optional)
    - [Set up Globus endpoint for `Perlmutter` at NERSC](https://davidljlab.wordpress.com/2018/07/18/swif2-testing/)
    - [GlueX](https://halldweb.jlab.org/wiki/index.php/HOWTO_Execute_a_Launch_using_NERSC)

2. No password login to `Perlmutter` is required. Please refer to the [Collaboration Accounts](https://docs.nersc.gov/accounts/collaboration_accounts/) page for more information. Notice that `group-name` in the command `./sshproxy.sh -c group-name` has to be set to a valid group name to have long days of no password login. Please refer to the [GlueX](https://halldweb.jlab.org/wiki/index.php/HOWTO_Execute_a_Launch_using_NERSC) for more information.

3. To run workflows at NERSC, refer to the scripts `new_wf.py` and `wf_config.yaml` in `deploy-vk-swif-nersc` for the workflow configuration.
    - When running the workflow for the first time, site information will be created according to the `wf_config.yaml` file. Make sure that the site information is correct. To check the site information, use `swif show-sites`.
    - Once the site information is created, any sites with the same name will not be created again. Check [swif-create-site](https://scicomp.jlab.org/cli/create.html) for more information.

4. Commands for the job must be a file located at the remote site. Specify the path to the file in the `job:cmd_file` field of `wf_config.yaml`.

## Running vk-cmd with SWIF2 at NERSC
1. Make sure the workflows can be submitted via SWIF2. Refer to the previous section for the setup.

2. To run `vk-cmd` at NERSC, establish the connection between the compute nodes at NERSC and the Kubernetes API server at JLab.

3. Run `make_ssh_tunnels.sh` at `ifarm` to establish the connection from the API server to the login at `Perlmutter`. The script will create two tunnels, one from the API server to `ifarm`, and the other from `ifarm` to the login at `Perlmutter`. 
    ```bash
    # s: jiriaf2301, c: ifarm
    ssh -NfL 12347:localhost:35393 jiriaf2302

    # s: ifarm, c: perlmutter
    ssh -NfR 35393:localhost:12347 perlmutter 
    ## Record the return login ID (e.g. x3113c0s11b0n0) for the next step.
    ```
    **Notice**: When executing the second command, one has to record the `login ID` (e.g. x3113c0s11b0n0) of the login node at NERSC. This is for the next step, which is to create a tunnel from the compute node to the login node.


4. To connect compute nodes at `Perlmutter` to the API server at JLab, create a tunnel from the compute nodes to the login at `Perlmutter`. Include this command in the job script located at the `job:cmd_file` field of `wf_config.yaml`. 
    ```bash
    ssh -i $HOME/.ssh/nersc -NfL <PORT-control-plane>:localhost:<PORT-control-plane> login ID
    ```
    **Notice**: Make sure that one creates `$HOME/.ssh/nersc` and places it at login at `Perlmutter`.