// ./types/nodeMetric.ts

export interface NodeMetric {
    metadata: NodeMetadata;
    timestamp: string;
    window: string;
    usage: NodeUsage;
    node: string;
    totalCpu: string;
    allocatedCpu: string;
    availableCpu: string;
    totalMemory: string;
    allocatedMemory: string;
    availableMemory: string;
    walltime: string;
    nodetype: string;
    site: string;
    alivetime: string;
    status: string; 
}

export interface NodeMetadata {
    name: string;
    creationTimestamp: string;
    labels: { [key: string]: string };
}

export interface NodeUsage {
    cpu: string;
    memory: string;
}

export interface Result {
    body: {
        items: NodeMetric[];
    };
}
