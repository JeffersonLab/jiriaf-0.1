# scripts/jiriaf-tables/customObjectsAPI.py
import asyncio
import websockets
import time
from kubernetes import client, config
from tabulate import tabulate
import json

# Load the kube config from the default location (i.e., ~/.kube/config)
config.load_kube_config()

# Create an API client for the Metrics API
v1beta1api = client.CustomObjectsApi()

# Create an API client for the Core API
v1 = client.CoreV1Api()

async def send_metrics(websocket, path):
    print("Client connected...")
    while True:
        node_metrics = get_node_metrics()
        pod_metrics = get_pod_metrics()
        pod_status = get_pod_status()
        print("Sending metrics...") 
        print(f"Node Metrics: {node_metrics}")
        print(f"Pod Metrics: {pod_metrics}")
        # print(f"Pod Status: {pod_status}")
        await websocket.send(json.dumps({
            "node_metrics": node_metrics,
            "pod_metrics": pod_metrics,
            "pod_status": pod_status
        }))
        await asyncio.sleep(5)

def get_node_metrics():
    nodes = v1beta1api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "nodes")
    node_table = []
    for node in nodes['items']:
        table = [node['metadata']['name']]
        cpu = node['usage']['cpu']
        if cpu[-1:] == 'n':
            table.append(int(cpu[:-1]) / 1000000000)
        elif cpu[-1:] == 'u':
            table.append(int(cpu[:-1]) / 1000000)
        elif cpu[-1:] == 'm':
            table.append(int(cpu[:-1]) / 1000)
        else:
            table.append(int(cpu))

        memory = node['usage']['memory']
        if memory[-2:] == 'Ki':
            table.append(int(memory[:-2]) * 1024)
        elif memory[-2:] == 'Mi':
            table.append(int(memory[:-2]) * 1024 * 1024)
        elif memory[-2:] == 'Gi':
            table.append(int(memory[:-2]) * 1024 * 1024 * 1024)
        else:
            table.append(memory)

        node_table.append(table)
    return [{"node": row[0], "cpu": row[1], "memory": row[2]} for row in node_table]

def get_pod_metrics():
    pods = v1beta1api.list_namespaced_custom_object("metrics.k8s.io", "v1beta1", "default", "pods")
    pods_table = []
    for pod in pods['items']:
        cpu = 0
        memory = 0
        for container in pod['containers']:
            cpu += parse_cpu(container['usage']['cpu'])
            memory += parse_memory(container['usage']['memory'])

        pods_table.append([pod['metadata']['name'], cpu, memory])
    return [{"pod": row[0], "cpu": row[1], "memory": row[2]} for row in pods_table]

def parse_cpu(cpu_value):
    if cpu_value[-1:] == 'n':
        return int(cpu_value[:-1]) / 1000000000
    elif cpu_value[-1:] == 'u':
        return int(cpu_value[:-1]) / 1000000
    elif cpu_value[-1:] == 'm':
        return int(cpu_value[:-1]) / 1000
    else:
        return int(cpu_value)

def parse_memory(memory_value):
    if memory_value[-2:] == 'Ki':
        return int(memory_value[:-2]) * 1024
    elif memory_value[-2:] == 'Mi':
        return int(memory_value[:-2]) * 1024 * 1024
    elif memory_value[-2:] == 'Gi':
        return int(memory_value[:-2]) * 1024 * 1024 * 1024
    else:
        return int(memory_value)

def get_pod_status():
    ret = v1.list_namespaced_pod("default")
    table = []
    for i in ret.items:
        table.append([i.metadata.name, i.status.phase])
    return tabulate(table, headers=["Pod", "Status"])

async def main():
    print("Starting WebSocket server...")
    async with websockets.serve(send_metrics, "localhost", 8765):
        print("WebSocket server started. Awaiting connections...")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
