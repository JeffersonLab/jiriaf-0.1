from kubernetes import client, config

config.load_kube_config()


v1=client.CoreV1Api()
print("Listing pods with their IPs:")
ret = v1.list_pod_for_all_namespaces(watch=False)
for i in ret.items:
    print("%s\t%s\t%s" % (i.status.pod_ip, i.metadata.namespace, i.metadata.name))

# listing nodes with their IPs
print("Listing nodes with their IPs:")
ret = v1.list_node(watch=False)
for i in ret.items:
    print("%s\t%s" % (i.status.addresses[0].address, i.metadata.name))

# describe the details of the node vk-mylin
print("Describing node vk-mylin")
print(v1.read_node("vk-mylin"))
# dunmp the details of the node vk-mylin to a file
with open("vk-mylin.yaml", "w") as f:
    f.write(v1.read_node("vk-mylin").to_str())
    

