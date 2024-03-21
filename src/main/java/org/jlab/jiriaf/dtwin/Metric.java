package org.jlab.jiriaf.dtwin;

public class Metric {
    double throughput;
    double latency;
    double errorRate;

    public Metric(double throughput, double latency, double errorRate) {
        this.throughput = throughput;
        this.latency = latency;
        this.errorRate = errorRate;
    }

}
