# Build the Docker image of virtual-kubelet-cmd
Vk-cmd is the Docker image of [virtual-kubelet-cmd](https://github.com/tsaie79/virtual-kubelet-cmd), which is a BASH shell command provider for Virtual Kubelet. The image is built with reference to [KinD](https://github.com/kubernetes-sigs/kind).

## Build image
To build the `vk-cmd` Docker image, follow these steps:

- The config file of the apiserver (control plane) is located at `/images/base/activate/config` in the Docker image. Port, cert, and key settings are set by KinD (`~/.kube/config`) as an example, and must be set by users when building this image. The URL of the apiserver is set to `127.0.0.1`, which means that building an SSH tunnel mapping from `vk` to the control plane is required.
- The `Client.crt` and `client.key` files are required but not used in this package. They can be created using `tools/create-client-cert.sh`.
- The Dockerfile is located at `docker/images/base/Dockerfile`. To build the Docker image, run the following command:
  ```bash
  make quick
  ```

## Launching vk-cmd
To launch `vk-cmd`, follow these steps:

1. Build an SSH tunnel mapping from `vk` to the control plane using the following command:
    ```bash
    ssh -NfL localhost:port1:localhost:port xxx@control-plane
    ```
    - If the host network is not available, use `docker --network="host"`. However, this is not recommended for security reasons. (see Column 4 in Table 1)

2. Build a UNIX pipe for executing commands on the host within the container. See `tools/pipeline/README.md` for more information. To bind volumes using Docker, use the following command:
    ```bash
    docker -v $HOME/hostpipe:/path/to/pipeline/in/container`
    ```
    - Note that some compute sites bind `$HOME` automatically, so you don't need to bind the pipeline if it's located under `$HOME`. (see Columns 2 and 3 in Table 1)

3. Set a unique environment variable `$NODENAME`. This sets the name of the worker node in the Kubernetes cluster and must be unique. To convey environment variables to a Docker container, use the following command:
    ```bash
    docker -e NODENAME="vk-xxx" (vk-xxx is required, but xxx can be any string)
    ```
    - Note that some compute sites allow a container to share environment variables with its host. (see Column 5 in Table 1)

4. Run `vk-cmd` with various commands. See Table 2 for more information.

5. Supplemental bash scripts are located at `run/`.


## Deploying job pods
To deploy job pods, follow these steps:

1. Refer to `tools/job_pod_template.yaml`.
2. Set `metadata:name` (job-name/pod-name) and `spec:nodeSelector:kubernetes.io/role` in YAML as the `agent`, to prevent launching pods in the control plane.
3. Set resources by `spec:containers:0:resources:` in YAML.
    - `limits` and `requests` are the upper and lower bounds of resources, respectively.
4. Assign shell commands at the key of `spec:containers:0:command` in YAML.
    - See Table 3.
    - Note that if `$HOME` is mounted and bound automatically, then `$HOME` in the container is the same as that in the host.
5. Launch the job pod on the control plane using the following command:
    ```bash
    kubectl apply -f tools/job_pod_template.yaml
    ```

## Tables
- Table 1: Scenarios when launching vk-cmd

|                    | CRI       | Available $HOME in container | Need to bind pipeline located at $HOME/hostpipe/vk-cmd | Available host network in container | Available env variables from host shell |
|--------------------|-----------|------------------------------|---------------------------------------------------------|-------------------------------------|-----------------------------------------|
| Jiriaf2301         | Docker    | No                           | Yes                           | No                                  | No                                      |
| ifarm              | Apptainer | Yes                          | No                                                      | Yes                                 | Yes                                     |
| Perlmutter (NERSC) | Shifter   | Yes                          | No                                                      | Yes                                 | Yes                                     |

- Table 2: Steps of running vk-cmd image

|                    | Step 0                                        | Step 1                           | Step 2                | Step 3                                                                                                  |
|--------------------|-----------------------------------------------|----------------------------------|-----------------------|---------------------------------------------------------------------------------------------------------|
| Jiriaf2301         | Build SSH tunnel from worker to control plane | Build pipeline in the background | setenv NODENAME vk-xxx | docker run -d -v $HOME/hostpipe:/root/hostpipe --network="host" -e NODENAME=$NODENAME jlabtsai/vk-cmd:tag |
| ifarm              |                                               |                                  |                       | apptainer run docker://jlabtsai/vk-cmd:tag                                                              |
| Perlmutter (NERSC) |                                               |                                  | export NODENAME=vk-xxx | shifter --image=docker:jlabtsai/vk-cmd:tag --entrypoint                                               |



- Table 3: Shell cmds in job pod YAML to run images

|                    | The Spec.Containers[0].Command in pod YAML to run image app                                                             |
|--------------------|-------------------------------------------------------------------------------------------------|
| Jiriaf2301         | "echo 'docker run godlovedc/lolcow:latest' > /root/hostpipe/vk-cmd"                               |
| ifarm              | "echo 'apptainer run docker://sylabsio/lolcow:latest' > $HOME/hostpipe/vk-cmd"   |
| Perlmutter (NERSC) | "echo 'shifter --image=godlovedc/lolcow:latest --entrypoint' > $HOME/hostpipe/vk-cmd" |


## Use kubernetes API to get information about the cluster
Please see `tools/kubernetes-api/readme.md` for details.

# Monitoring via Prometheus process exporter
See `prom/README.md` for details.


# References
The implementation of `vk-cmd` is based on the mock provider in [Virtual Kubelet](https://github.com/virtual-kubelet/virtual-kubelet). The source code of this repository is stored in [virtual-kubelet-cmd](https://github.com/tsaie79/virtual-kubelet-cmd). The `vk-cmd` image is built using the Dockerfile in this repository and refers to [KinD](https://github.com/kubernetes-sigs/kind). The image is stored in [Docker Hub](https://hub.docker.com/repository/docker/jlabtsai/vk-cmd). 