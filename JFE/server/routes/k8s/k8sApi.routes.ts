import * as k8s from '@kubernetes/client-node';
import { getConfigValue } from '../../util/config.utils';
import { Router } from 'express';

const kc = new k8s.KubeConfig();

const clusterName = 'kind-jlab-cluster';
const userName = 'kind-jlab-cluster';
const contextName = 'kind-jlab-cluster';
const serverUrl = 'https://127.0.0.1:39901'; 

// Paths to certificate files 
const caPath = './apiserver/ca.crt';
const clientCertPath = './apiserver/client.crt';
const clientKeyPath = './apiserver/client.key';


const caData = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1Ea3lNakF6TURneU9Gb1hEVE16TURreE9UQXpNRGd5T0Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTVBTClhBR1J3VVQ2RWU2OHl5Ylo0SnU0OVMzS2UxSU9UYm1WTGFnZGZSWS91YmF4Qi9TTGR4SXFIVnRoR3NMTnk4YmgKd3ZQcldBZ0RsZHdVdGVwSTlQbi9RNWozSHdvbGVBRjBCUisvN3ZoVVg4em1Dc0kyM29XbndwMVU2Y21rMk5USApRVitlNVlPS1hXYURJd2JyMlNib3FIWU1ZRmE1NXV6V0JxSjRGRlB1aWo5R0dYeHM3bDdXS2hndWFGNjBDM3R3CnhmYnRUa2ZmcGtnNTB4QUxmY1d0aEVqR1Q1MUI3eWxvdWNOOEkvQXpvRTVGc1RPZm5NRTM0TUVoZW9JYmxZRmgKRXRETVNuaHYxblZFZ21TaXBwMVpTN1VWY3RpbHJsSStVb1EzTEFsVy9yVmRTd2g1RnJoUjdTaEpNajI0NGhueApuZ0ZxUEJsWkQreDZDUTNJcmtzQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZJNEF0WnpmaGhVa0hVeWYrc1FkcHdoQjhZUzJNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRVZrUjNOU1VxRmZOQXBKcHlCegppRVoxbWhjU0ZzMCtxbWVwQ2s1THI3TWJ2dGZHZjFKT1Q3ZHdtZTBVYnBIa1A2aTl3VnhkWmdrRlpzdFVlVkxoCmp2a0RJMHQxcWpGRVlHY2EwMGlpVXIxdGhHSHVuRGYrdnlLdzRGTDN6SFhoQUFrL1gzUzdJYVh4ZVYxZmtPUUsKVDBlSG1GRmdOb2hianZ2Vys2NnpMdUtSWlg1NjhDVTZjUkV0Rlo0SnhvZXZLRXVzSXZCRGRnZ1VqekF3KytGaApNZXpNVk9WUStQa01CZ2o2OTdHUGNoamx3VXpiL2hNWUMwTDNvc1NaZ2RLZkdoVTdYdFNkbVhKM21kczVyalRKCjBHZ3BtK1FMRHRkTlJXN3hDbmc0RmxQK3gybTdVOTAwWjN5eUVjeGhmbzNCc25IekJTRFF3eWd1dVVHUkRxQWIKVFVnPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=='; // Base64 encoded
const clientCertData = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJRzlTcDdCMVpoeHd3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBNU1qSXdNekE0TWpoYUZ3MHlOREE1TWpFd016QTRNamhhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQTIxM0IyUm5LRkpmMnN2TmwKUU96S1NNR0pXQ2MvbU1mdUR1NWN2WjlsM0pNTmZRMDlnVHQvb2pNaDJjWXE0QzU0d0kzYTdyaXRjZEhWY1A2TApTbUlUb3pzOGhXTWpza0ZVZ2xTbDJwTlBhVEE5clJRc05DL00xQW9xNnU1bXNuZEM0ZXhBQUtTZDFGSzIyN3J3CkRDM0djdFhpWWxZRVB4b0RJRGUvcGR0SGZMc1pRREVxQU1pWFJpWWJDMGduRkJGZ0ZlZDJWNVdqcHY1L2szZ0MKT2g2V2FUcUpqU0pzOVJSa0dCYnpIeEtxWGZIR3MwdVQxRDdtUDN0NWpNbEsxRmZiZkphUUhJNnFEUnNXRytDSQpMUzFncGR2ZHNHenV1djh2Nm4xWjlCbXN3VjZhMTlWa1RRWXkwem4xa05kcFZlSVBrNStlRjZ0Q1gwUWtRTHJnCnFROGFQUUlEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JTT0FMV2MzNFlWSkIxTW4vckVIYWNJUWZHRQp0akFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBaUJRUDNWUkVDMmF2RzFicWppZnBYanphUjZYdEs2bTU0Q0l6Cno4TnBrOXJwbndVSlNYMUlyNFljdjlseWhvWVcvWmNTWGhEYjJLZ09PcjZBRTlzTXU3SWVhSzZkYjlHUWVKRHkKaUd3Ymw0QmQ4ODl2VUU4eVdTNTJKY1EzckxERllmMWxlVXM4QzQvUTVhMzNHUlZBSXp4dDFyS3BhWk9seEhuZQpmZTRCYjB3TGJQQ3FyMWJSbFgrblRLVmVkbnJQc1hSZ0JQN2wyNzBySVhKSWpvekNiK21HRWIwL2JXbDJSRjIwCjJOQTQ5UDF0NWNQTFpFVlVicS95empnVkY2WVRaSUVoditUSmJPd3VSczk5TzQxYXNhSFZUR1JZandlMVBXZXkKNlZPSVV2R3JWYkhVM2IrMEZWMkJWR2IxM0g0WEVnM05NS0REeWZMUVQya3JKMkxDZ2c9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=='; // Base64 encoded
const clientKeyData = 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBMjEzQjJSbktGSmYyc3ZObFFPektTTUdKV0NjL21NZnVEdTVjdlo5bDNKTU5mUTA5CmdUdC9vak1oMmNZcTRDNTR3STNhN3JpdGNkSFZjUDZMU21JVG96czhoV01qc2tGVWdsU2wycE5QYVRBOXJSUXMKTkMvTTFBb3E2dTVtc25kQzRleEFBS1NkMUZLMjI3cndEQzNHY3RYaVlsWUVQeG9ESURlL3BkdEhmTHNaUURFcQpBTWlYUmlZYkMwZ25GQkZnRmVkMlY1V2pwdjUvazNnQ09oNldhVHFKalNKczlSUmtHQmJ6SHhLcVhmSEdzMHVUCjFEN21QM3Q1ak1sSzFGZmJmSmFRSEk2cURSc1dHK0NJTFMxZ3BkdmRzR3p1dXY4djZuMVo5Qm1zd1Y2YTE5VmsKVFFZeTB6bjFrTmRwVmVJUGs1K2VGNnRDWDBRa1FMcmdxUThhUFFJREFRQUJBb0lCQUZDSmlvcm5ZZjdQai81QgpTQkpmSFNFN0ZPNnRjamJvYUNsSkwvbGFWUzUzT3NPSG9lWVpieEdnempQREFxak54djJDMXpjL3pFWDJjUE9NCk1KMTlocEl1UkZrQWZmR0s5TGpvMVA5N2gvTXBoK3RNZGJJdlBuYzJ5R3o2VysvM3d6Rm82RktVSFhIL2NDMFoKNDluRTBKQUdvSmZUMXJsSUZvKzBpQU1majQ1bUFHUG1Dc25rc1FoNG44WnJRWmxOSm9yclZMMzRRazRvaXNPcApHbXE4KzM3bmFZa3I5Z0JsRThZUFJhZU5qbm1yc3VIbWZ4cVphSUV4SURkTzh0bTE2TWl5dlRqQk9VdHVxL09JCjhRYWliemFuRTNaSVpqSTVDQk1jaTR1cmZsMzdRa1hEeG92eVEwSU1jVWlzVGZiYlh1UGNlaHNYYnZHbld5V1kKcTBRZnN1RUNnWUVBK3VCc2pNZkJKbnBNa3lvWDI5SjJ6WVZkTjdySEtneFBjU3F4NWFkSzBod3pkazlMNXJBOApVOXJPcUFmQnhhRHdUa0xqcHAxdjRCSmsvSTIzazY5ZTFUWWd3Tll3bFlLdDMrRi94dFVlNTBGVGlJaUdoaysxCnM5VDVOTW9lYldUWjdmNkl4QnVlM29XdS82SmdZZDRNbllXenNET2FvQXlldkdaZmZnQ05La1VDZ1lFQTM5aVkKL3JtWDJsOGR6WGtVWUJxZmRUQVgyZGRvMm1DNGhBYzF2ZUh3Y0NjL1Q4RG0rTFIycFM2Wlp2Z0FWekpzTzdPawo5SmpUZXlSSzlXUEZnSWpzaDBEQWRVZVkwaklZeUVhbGhoaXVtaWF6M21jM3lRZnBHT0R3Y0Z6Uk1FMGdiOFE0CndoMTAxQzFmTE5IeHl3TVU1RzJKTnhYZnUrWkorMFAxQzFkT2E1a0NnWUIvazRhLzVJamRkMDNmZklWYmZPQjcKVFBtRmNJNzlXL3MrRWpjYkVRS2tiRURqUmhuVCt3VUNvMzk1eFZBTm52VDA1MkQ3Qm82d3hNbmtBSEU5UWU0WQp3SWpSWjFxWGZUZk1aTkRrbk5ZMVJXd2tQMEVocGdGQnJPajVwbHJveUdObWVveTBKVk9aMXlPUnpkSHprc2FaCmlEZERRRXErWHd5TnhBV0ZmdVJLZlFLQmdRQy9PL2N4SHZOcFh2dENFQi9sSHJsOXoxR0JEUE9LSlRsZHFoOHkKa25Uc0M4dWQ0Z294RFZPVE9PVmJQNkppM0RQMUtUdFNyOEYwb1lQY2NwbEhmeks3TmdsMTZHM1puV3pvcE5wQwpYcEhFSmk1aVljSVozOFUzT095UXdlc0JIZE1KU1JUSVdZdjJ2TEJqeFJTUndKYzNzNUNYVy91aE5sT2I4dW5FCi81aUNlUUtCZ0cxZGFOM2pGanVSTlRXc0drR2g0QW95M3dBNGMyNlJ0dW1zZkg1Mm9McEQyU2hZUW95SEN1ZzEKV2VQc0RXS2gzRTdGa3psSlB3aXAxYjRxaHZjYlA0c3RrZmkvNXY5VUtOVDBzdHMzakNuV21DallXa0QrbkFNQQpPdVlFYTlxM25xaXJrc21hRkZoUHYzbHNiT0Vub2djVXUzMElRb2tYNXBYUThJZ0VrajdsCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg=='; // Base64 encoded

const k8sToken = getConfigValue('K8_METRIC_SERVER_TOKEN');

kc.loadFromOptions({
    clusters: [{
        name: clusterName,
        server: serverUrl,
        // certificateAuthorityData: Buffer.from(caData, 'base64').toString('utf8'),
    }],
    users: [{
        name: userName,
        certData: Buffer.from(clientCertData, 'base64').toString('utf8'),
        keyData: Buffer.from(clientKeyData, 'base64').toString('utf8'),
        token: k8sToken,
    }],
    contexts: [{
        name: contextName,
        user: userName,
        cluster: clusterName,
    }],
    currentContext: contextName,
});

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