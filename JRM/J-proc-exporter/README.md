# Process exporter along with the algorithm of automatic generation of configuration file

This process exporter is based on [ncabatoff/process-exporter](https://github.com/ncabatoff/process-exporter.git), combined with the algorithm of automatic generation of configuration file. The algorithm is based on the fact that the processes in a container are children of the session leader of the container. The session leader is the first process in the container. The algorithm is implemented in `get_cmd.sh` and `exe.sh`. 

Docker imgae is built from the Dockerfile in this directory and uploaded to [jlabtsai/process-exporter/v1.0.0](https://hub.docker.com/repository/docker/jlabtsai/process-exporter).



# Find PIDs of processes running in a container

To use process-exporter, one needs to know the PIDs of the processes to be monitored. This is easy if the processes are running on the host, but if they are running in a container, it is not. Here is a way to find the PIDs of processes running in a container. It is tested on Perlmutter. It may not work on other machines.


## 1. Launch a container with `setsid`
`setid` is a command that launches a process in a new session. It is useful for this purpose because it makes the container the session leader, and all processes in the container are children of the session leader. This makes it easy to find the PIDs of all processes in the container.

```
setsid shifter docker-img & echo $! >> sid.out
```
For example: 
```
setsid shifter --image=docker:jlabtsai/read-resources:latest -- stress-ng -c 2 --timeout 100 & echo $! >> sid.out
```

## 2. Find the PIDs of all processes in the container
The `sid.out` file contains the **PID/PID-1** of the leader process of the container. To find the PIDs of all processes (including the leader) in the container, run the following command:
```
pgrep -s $(cat sid.out)
```
**Warning**: The number shown in `sid.out` can represent different things:
- If the container is launche via `vk-cmd`, then it is the PID of the leader process of the container.
- If the container is launched directly from `shifter` on the shell, then `number-in-sid.out + 1` is the PID of the leader process of the container.


# Run process-exporter along with the user's pod
The process-exporter image used in this example is built from the Dockerfile in this directory. This works with the existing file `$HOME/sid.out` containing the leader PID of the container when launching the pod. If the file is not present, the process-exporter will not work.

## Files to build the process-exporter image
1. `get_cmd.sh` is used to read `sid.out` and generate the configuration file for the process-exporter. 
2. `process-exporter-config.yml` is the template of configuration file for the process-exporter.
3. `exe.sh` is the main script running the process exporter.


## Commands in the user's pod configuration file

The following commands are used to launch the user's pod and the process-exporter container.
It is a **one liner command** in the `command` field of the pod configuration file. 
Here, we decompose it into **3 parts** for clarity. The example pod configuration file is `pod-for-procees-exporter.yml`.


1. When user's pod is launched via `vk-cmd`, the `$HOME/sid.out` must be created and the PID of the leader process of the pod must be written to it. 

```
(setsid shifter --image=docker:jlabtsai/stress:v20231026 --entrypoint& echo $! > ~/sid.out)
```

2. Launch the process-exporter container with the environment variables set.
    
```
(export PROCESS_EXPORTER_PORT=1911 && export PROM_SERVER=jeng-yuantsai@72.84.73.170 && setsid shifter --image=jlabtsai/process-exporter:v1.0 -V /proc:/host_proc --entrypoint &)
```
```
PROCESS_EXPORTER_PORT: export the port number of the process-exporter container
PROM_SERVER: export the address of the prometheus server
```

3. Port-forward the process-exporter port to the host.
```
(export PROCESS_EXPORTER_PORT=1911 && export PROM_SERVER=jeng-yuantsai@72.84.73.170 && ssh -NfR $PROCESS_EXPORTER_PORT:localhost:$PROCESS_EXPORTER_PORT $PROM_SERVER)
```

# Configuration of the process-exporter and prometheus server
## Process-exporter configuration
The `name: "{{.ExeBase}};{{.Username}};{{.PID}}"` in the `process-exporter-config.yml` is used to group the target processes. This should be changed to the user's need. 

## Prometheus server configuration
The `prometheus.yml` file in the `prom` directory is the configuration file for the prometheus server. The `job_name` in the `scrape_configs` section should be changed to the user's need. The targets should be the addresses of the process-exporter containers.
