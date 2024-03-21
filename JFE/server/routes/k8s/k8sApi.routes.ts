import * as k8s from '@kubernetes/client-node';
import { Router } from 'express';


const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const customK8Api = kc.makeApiClient(k8s.CustomObjectsApi);
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const router = Router();

router.get('/node-metrics', async (req, res) => {
    try {
        const result: any = await customK8Api.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
        res.send(result.body.items);
    } catch (err) {
        res.status(500).send(`Error fetching node metrics: ${err}`);
    }
});

router.get('/pod-metrics', async (req, res) => {
    try {
        const result: any = await customK8Api.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'pods');
        res.send(result.body.items);
    } catch (err) {
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
            },
            data: {
                'stress.sh': `#!/bin/bash
    # Run the Docker container and capture its ID
    CONTAINER_ID=$(docker run -d --rm -e NUMBER=$2 -e TIME=$1 jlabtsai/stress:latest)
    # Wait for the container to finish
    docker wait $CONTAINER_ID`
            },
        },
        spec: {
            containers: [{
                name: 'c1',
                image: 'docker-stress',
                command: ['bash'],
                args: args,
                volumeMounts: [{
                    name: 'docker-stress',
                    mountPath: 'stress/job1',
                }],
                resources: {
                    limits: {
                        cpu: cpu,
                        memory: memory,
                    },
                    requests: {
                        cpu: cpu,
                        memory: memory,
                    },
                },
            }],
            volumes: [{
                name: 'docker-stress',
                configMap: {
                    name: 'docker-stress',
                },
            }],
            restartPolicy: 'Never',
        },
    };

    try {
        await k8sApi.createNamespacedPod('default', podManifest);
        res.status(201).send(`Pod ${name} deployed successfully`);
    } catch (err: any) {
        console.error(`Failed to deploy pod:`, err);
        res.status(500).send(`Error deploying pod: ${err.message}`);
    }
});
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

export default router;