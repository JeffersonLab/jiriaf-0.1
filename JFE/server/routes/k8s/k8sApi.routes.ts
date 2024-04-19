import * as k8s from '@kubernetes/client-node';
import { Router,Request,Response } from 'express';
import { NodeMetric, Result } from '../../types/nodeMetric';
import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';


const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const customK8Api = kc.makeApiClient(k8s.CustomObjectsApi);
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const router = Router();

router.get('/node-metrics', async (_req: Request, res: Response) => {
    // console.log('GET /node-metrics');
    try {
        const nodes = await k8sApi.listNode();
        // console.log('nodes:', nodes);
        const nodeMetricsPromises = nodes.body.items.map(async node => {
            const nodeName = node.metadata?.name;
            const totalCpu = parseCpu(node.status?.allocatable?.cpu ??'UNKNOWN' );
            const totalMemory = parseMemory(node.status?.allocatable?.memory ?? 'UNKNOWN');

            // Fetch all pods for the current node
            const pods = await k8sApi.listPodForAllNamespaces(true, undefined, `spec.nodeName=${nodeName}`);
            let allocatedCpu = 0;
            let allocatedMemory = 0;

            for (const pod of pods.body.items) {
                if (pod.status?.phase === 'Running') {
                    pod.spec?.containers.forEach(container => {
                        if (container.resources?.requests) {
                            allocatedCpu += parseCpu(container.resources?.requests.cpu || '0');
                            allocatedMemory += parseMemory(container.resources.requests.memory || '0');
                        }
                    });
                }
            }

            const availableCpu = totalCpu - allocatedCpu;
            const availableMemory = totalMemory - allocatedMemory;

            const walltime = node.metadata?.labels?.['jiriaf.walltime'] ?? 'N/A';
            const nodetype = node.metadata?.labels?.['jiriaf.nodetype'] || 'N/A';
            const site = node.metadata?.labels?.['jiriaf.site'] || 'N/A';
            const alivetime = node.metadata?.labels?.['jiriaf.alivetime'] || 'N/A';
            const status = node.status?.conditions?.find(condition => condition.type === "Ready")?.status === "True" ? "Ready" : "NotReady";
            
            return {
                node: nodeName,
                totalCpu: `${totalCpu}`,
                allocatedCpu: `${allocatedCpu}`,
                availableCpu: `${availableCpu}`,
                totalMemory: `${totalMemory}Gi`,
                allocatedMemory: `${allocatedMemory}Gi`,
                availableMemory: `${availableMemory}Gi`,
                walltime,
                nodetype,
                site,
                alivetime,
                status
            };
        });

        const nodeMetrics = await Promise.all(nodeMetricsPromises);
        res.json(nodeMetrics);
    } catch (err) {
        console.error('Error fetching node metrics:', err);
        res.status(500).send(`Error fetching node metrics: ${err}`);
    }
});

function parseCpu(cpuString: string): number {
    // Handle nano-cores (n) - convert nano-cores to cores (1 nano-core = 0.000000001 cores)
    if (cpuString.endsWith('n')) {
        return parseInt(cpuString, 10) / 1_000_000;
    }
    // Handle milli-cores (m) - convert milli-cores to cores (1 milli-core = 0.001 cores)
    else if (cpuString.endsWith('m')) {
        return parseInt(cpuString, 10) / 1000;
    }
    // Default case assumes the value is in cores already
    return parseInt(cpuString, 10);
}

function parseMemory(memoryString: string): number {
    let memory = 0;
    if (memoryString.endsWith('Ki')) {
        memory = parseInt(memoryString, 10) / (1024 * 1024);
    } else if (memoryString.endsWith('Mi')) {
        memory = parseInt(memoryString, 10) / 1024;
    } else if (memoryString.endsWith('Gi')) {
        memory = parseInt(memoryString, 10);
    }
    return memory;
}

router.get('/pod-status', async (req, res) => {
    const { podName } = req.query;
    console.log('GET /pod-status', podName);
    try {
        const result: any = await k8sApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, `metadata.name=${podName}`);
        const pod = result.body.items[0];
        const status = pod.state?.phase;
        res.json({ status });
    } catch (err) {
        console.error('Error fetching pod status:', err);
        res.status(500).send(`Error fetching pod status: ${err}`);
    }
});
router.get('/pod-metrics', async (req, res) => {
    try {
        const result: any = await customK8Api.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'pods');
        const formattedMetrics = result.body.items.map((item: any) => {
            const podName = item.metadata.name;
            const containerMetrics = item.containers.map((container: any) => ({
                cpu: container.usage.cpu, 
                memory: container.usage.memory, 
            }));
            
            
            const totalCpu = containerMetrics.reduce((acc: number, curr: any) => acc + parseCpu(curr.cpu), 0);
            const totalMemory = containerMetrics.reduce((acc: number, curr: any) => acc + parseMemory(curr.memory), 0);

            return {
                pod: podName,
                cpu: `${totalCpu.toFixed(3)} cores`, 
                memory: `${totalMemory.toFixed(3)} Gi`, 
            };
        });

        res.json(formattedMetrics);
    } catch (err) {
        console.error('Error fetching pod metrics:', err);
        res.status(500).send(`Error fetching pod metrics: ${err}`);
    }
});



router.post('/deploy-pod', async (req, res) => {
    const { name, args, cpu, memory } = req.body;
    console.log('Deploying pod:', name, args, cpu, memory);

    if (!name) {
        return res.status(400).send('Pod name is required');
    }

    const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: name, 
            labels: {
                user: 'user1',
            }
        },
        spec: {
            containers: [
                {
                    name: 'c1',
                    image: 'docker-stress',
                    command: ['bash'],
                    args: [args[0], args[1], `/default/${name}/containers/c1/p`],
                    volumeMounts: [
                        {
                            name: 'docker-stress',
                            mountPath: '/docker-stress',
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: cpu,
                            memory: `${memory}Gi`
                        },
                        requests: {
                            cpu: cpu,
                            memory: `${memory}Gi`
                        },
                    }
                },
                {
                    name: 'c2',
                    image: 'get-pgid',
                    command: ['bash'],
                    args: [`/default/${name}/containers/c1/p`, `/default/${name}/containers/c1/pgid`],
                    volumeMounts: [
                        {
                            name: 'get-pgid',
                            mountPath: '/get-pgid',
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: cpu,
                            memory: `${memory}Gi`
                        },
                        requests: {
                            cpu: cpu,
                            memory: `${memory}Gi`
                        },
                    }
                }
            ],
            volumes: [
                {
                    name: 'docker-stress',
                    configMap: {
                        name: 'docker-stress',
                    }
                },
                {
                    name: 'get-pgid',
                    configMap: {
                        name: 'get-pgid',
                    }
                }
            ],
            restartPolicy: 'Never',
            nodeSelector: {
                "kubernetes.io/role": "agent"
            },
            affinity: {
                nodeAffinity: {
                    requiredDuringSchedulingIgnoredDuringExecution: {
                        nodeSelectorTerms: [
                            {
                                matchExpressions: [
                                    { key: "jiriaf.nodetype", operator: "In", values: ["cpu"] },
                                    { key: "jiriaf.site", operator: "In", values: ["jiriaf"] }
                                ]
                            }
                        ]
                    }
                }
            },
            tolerations: [
                {
                    key: "virtual-kubelet.io/provider",
                    value: "mock",
                    effect: "NoSchedule"
                }
            ]
        }
    };

    try {
        await k8sApi.createNamespacedPod('default', podManifest);
        res.status(201).send(`Pod ${name} deployed successfully`);
    } catch (err: any) {
        console.error(`Failed to deploy pod:`, err);
        res.status(500).send(`Error deploying pod: ${err.message}`);
    }
});
router.post('/remove-pod', async (req, res) => {
    console.log('POST /remove-pod');
    // console.log('req.body:', req.body);
    const { name } = req.body;
    console.log('Removing pod:', name);

    try {
        await k8sApi.deleteNamespacedPod(name, 'default');
        res.status(200).send(`Pod ${name} removed successfully`);
    } catch (err: any) {
        console.error(`Failed to remove pod:`, err);
        res.status(500).send(`Error removing pod: ${err.message}`);
    }
}
);

router.post('/deploy-pod-with-configmaps', async (req, res) => {
    const { name, args, cpu, memory } = req.body;


    // ConfigMaps
    const configMaps = [
        {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'docker-stress' },
            data: {
                'stress.sh': `#!/bin/bash
export PGID_FILE=$3
docker run -d --rm -e NUMBER=$2 -e TIME=$1 jlabtsai/stress:latest > /dev/null
## find the last container id
export CONTAINER_ID=$(docker ps -l -q)
docker inspect -f '{{.State.Pid}}' $CONTAINER_ID > $3
sleep $1`
            },
        },
        {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'get-pgid' },
            data: {
                'stress.sh': `#!/bin/bash
sleep 10
cp $1 $2`
            },
        },
    ];

    // Pod manifest
    const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: name,
            labels: {
                user: 'user1', // Hardcoded user tag
            },
        },
        spec: {
            containers: [
                {
                    name: 'c1',
                    image: 'docker-stress',
                    command: ['bash'],
                    args: [...args, `~/default/${name}/containers/c1/p`],
                    volumeMounts: [
                        {
                            name: 'docker-stress',
                            mountPath: 'docker-stress',
                        },
                    ],
                    resources: {
                        limits: { cpu: cpu, memory: memory },
                        requests: { cpu: cpu, memory: memory },
                    },
                },
                {
                    name: 'c2',
                    image: 'get-pgid',
                    command: ['bash'],
                    args: [`~/default/${name}/containers/c1/p`, `~/default/${name}/containers/c1/pgid`],
                    volumeMounts: [
                        {
                            name: 'get-pgid',
                            mountPath: 'get-pgid',
                        },
                    ],
                    resources: {
                        limits: { cpu: cpu, memory: memory },
                        requests: { cpu: cpu, memory: memory },
                    },
                },
            ],
            volumes: [
                {
                    name: 'docker-stress',
                    configMap: { name: 'docker-stress' },
                },
                {
                    name: 'get-pgid',
                    configMap: { name: 'get-pgid' },
                },
            ],
            restartPolicy: 'Never',
        },
    };

    try {
        // // Create ConfigMaps
        // for (const configMap of configMaps) {
        //     await k8sApi.createNamespacedConfigMap('default', configMap);
        // }
        for (const configMap of configMaps) {
            await createOrUpdateConfigMap('default', configMap);
        }
        // Create Pod
        await k8sApi.createNamespacedPod('default', podManifest);
        
        res.status(201).send('Pod and ConfigMaps deployed successfully');
    } catch (err) {
        console.error('Failed to deploy resources:', err);
        res.status(500).send('Error deploying resources');
    }
});

async function createOrUpdateConfigMap(namespace: string, configMap: k8s.V1ConfigMap) {
    try {
        // Try to get the existing ConfigMap
        const existingConfigMap = await k8sApi.readNamespacedConfigMap(configMap.metadata?.name ?? '', namespace);
        console.log(`ConfigMap existingConfigMap: ${existingConfigMap.body.apiVersion}`);
        console.log(`ConfigMap ${configMap.metadata?.name} already exists, updating...`);
        // If exists, replace it with the new one
        await k8sApi.replaceNamespacedConfigMap(configMap.metadata?.name ?? '', namespace, configMap);
        console.log(`ConfigMap ${configMap.metadata?.name} updated successfully.`);
    } catch (err: any) {
        // If the ConfigMap does not exist, the API call will throw an error which we catch here
        if (err.response && err.response.statusCode === 404) {
            console.log(`ConfigMap ${configMap.metadata?.name ?? 'unknown'} does not exist, creating...`);
            // ConfigMap not found, create it
            await k8sApi.createNamespacedConfigMap(namespace, configMap);
            console.log(`ConfigMap ${configMap.metadata?.name ?? 'unknown'} created successfully.`);
        } else {
            // Other errors
            console.error(`Failed to create or update ConfigMap ${configMap.metadata?.name ?? 'unknown'}:`, err);
            throw err; // Rethrow the error for further handling
        }
    }
}

// Route to delete a pod by name
router.delete('/pods/:podName', async (req: Request, res: Response) => {
    const podName = req.params.podName;
    const namespace = 'default'; // Or extract from req.params if namespace is dynamic

    console.log(`Deleting pod: ${podName} from namespace: ${namespace}`);

    try {
        // Deleting the specified pod
        const deleteResponse = await k8sApi.deleteNamespacedPod(podName, namespace);
        console.log('Pod deletion response:', deleteResponse);
        res.status(200).send(`Pod ${podName} deleted successfully`);
    } catch (err: any) {
        console.error(`Failed to delete pod ${podName}:`, err);
        res.status(500).send(`Error deleting pod ${podName}: ${err.message}`);
    }
});


export default router;