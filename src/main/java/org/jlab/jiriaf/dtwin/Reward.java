package org.jlab.jiriaf.dtwin;

public class Reward {
    static double calculateReward(Metric metric) {
        // Simplified reward calculation based on metrics.
        // Higher throughput and lower latency/error rates yield higher rewards.
        return metric.throughput - metric.latency - metric.errorRate;
    }
}
