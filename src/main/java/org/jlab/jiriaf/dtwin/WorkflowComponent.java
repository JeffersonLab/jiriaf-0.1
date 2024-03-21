package org.jlab.jiriaf.dtwin;

public class WorkflowComponent {
    String name;
    Metric currentMetric;

    public WorkflowComponent(String name) {
        this.name = name;
    }

    void updateMetric(Metric metric) {
        this.currentMetric = metric;
    }
}
