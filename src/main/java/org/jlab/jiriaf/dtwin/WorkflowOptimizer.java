package org.jlab.jiriaf.dtwin;

public class WorkflowOptimizer {
    public static void main(String[] args) {
        WorkflowComponent component = new WorkflowComponent("DataProcessor");
        DigitalAgent agent = new DigitalAgent(component);

        // Simulate a workflow update
        component.updateMetric(new Metric(900, 0.5, 0.05));

        // Decide and apply an action
        Action action = agent.decideAction();
        agent.applyAction(action);

        // Calculate and print the reward
        double reward = Reward.calculateReward(component.currentMetric);
        System.out.println("Reward: " + reward);
    }

}
