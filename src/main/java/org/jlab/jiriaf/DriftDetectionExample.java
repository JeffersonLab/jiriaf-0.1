package org.jlab.jiriaf;

import moa.classifiers.core.driftdetection.ADWIN;
import moa.classifiers.functions.SGD;
import moa.core.InstanceExample;
import moa.core.TimingUtils;
import moa.evaluation.BasicClassificationPerformanceEvaluator;
import moa.streams.generators.RandomRBFGenerator;

public class DriftDetectionExample {

    public static void main(String[] args) {

        // Set up the stream
        RandomRBFGenerator stream = new RandomRBFGenerator();
        stream.prepareForUse();

        // Set up the classifier
        SGD classifier = new SGD();
        classifier.prepareForUse();

        // Set up the evaluator
        BasicClassificationPerformanceEvaluator evaluator = new BasicClassificationPerformanceEvaluator();

        // Set up the drift detector
        ADWIN adwin = new ADWIN();


        // Set up the variables for tracking time and accuracy
        long evaluateStartTime = TimingUtils.getNanoCPUTimeOfCurrentThread();
        int numberSamplesCorrectlyClassified = 0;
        int numberSamplesProcessed = 0;

        // Run the learning and testing tasks
        while (stream.hasMoreInstances()) {
            InstanceExample example = stream.nextInstance();

            // Update the drift detector with the latest instance
            adwin.setInput(example.getData().toDoubleArray()[0]);
            if (adwin.getChange()) {
                System.out.println("Drift detected at instance " + numberSamplesProcessed);
            }

            numberSamplesProcessed++;

            // Output the current time and accuracy every 1000 instances
//            if (numberSamplesProcessed % 1000 == 0) {
//                double accuracy = 100.0 * (double) numberSamplesCorrectlyClassified / (double) numberSamplesProcessed;
//                long evaluateEndTime = TimingUtils.getNanoCPUTimeOfCurrentThread();
//                long evaluateTime = evaluateEndTime - evaluateStartTime;
//                System.out.println(numberSamplesProcessed + " instances processed with accuracy: " +
//                        accuracy + "%; in " + evaluateTime + ".");
//            }
        }
    }
}
