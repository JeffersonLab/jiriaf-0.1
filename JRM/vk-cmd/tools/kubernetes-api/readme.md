# Use kubernetes API to get information about the cluster

## Setup
To set up the project, follow these steps:

1. Make sure you have the correct Kubernetes config file in `~/.kube/config`.
2. Install the required Python dependencies using the following command:
    ```bash
    pip install kubernetes
    ```
3. If necessary, run an SSH tunnel to the Kubernetes API.

## Usage
- To learn how to use the API, refer to the `python-client.py` Python script for examples.

## References
[Kubernetes API](https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/#programmatic-access-to-the-api)