package org.jlab.jiriaf;

import com.yahoo.labs.samoa.instances.Instance;
import moa.classifiers.Classifier;
import moa.classifiers.core.driftdetection.ADWIN;
import moa.classifiers.functions.SGD;
import moa.classifiers.meta.LimAttClassifier;

/**
 * Copyright (c) 2021, Jefferson Science Associates, all rights reserved.
 * See LICENSE.txt file.
 * Thomas Jefferson National Accelerator Facility
 * Experimental Physics Software and Computing Infrastructure Group
 * 12000, Jefferson Ave, Newport News, VA 23606
 * Phone : (757)-269-7100
 *
 * @author gurjyan on 4/12/23
 * @project jiriaf-0.1
 *
 * The clas is using adaptive window technic to detect a drift/shift in the
 * stream of integers.
 */


public class JDriftDetector {

    private ADWIN adwin;
    private SGD learner;

    public JDriftDetector() {
        adwin = new ADWIN();
        learner = new SGD();
        learner.prepareForUse();

    }

    /**
     * @param event from a stream
     * @return true if drift is detected
     */
    public boolean isChanged(double event) {
        adwin.setInput(event);
        return adwin.getDetect();
    }

    public void reset(){
        adwin.resetChange();
    }
    public boolean input(double inputValue) {
        double ErrEstim = this.adwin.getEstimation();
        if (adwin.setInput(inputValue)) {
            return adwin.getEstimation() > ErrEstim;
        }
        return false;
    }

    public static void main(String[] args) {
        double[] stream = {1.1, 1.1, 1.1, 1.1, 5.1, 1.1, 1.1, 1.1, 6.3, 1.1, 1.1, 1.1, 1020.0, 1.1, 1.1,1.1};
        JDriftDetector dfd = new JDriftDetector();
        for (double i : stream) {
            for (int j = 0; j<20; j++) {
                if(dfd.isChanged(i)) {
                    System.out.println("drift detected at " + i);
                    dfd.reset();
                }
            }
        }

        System.out.println(dfd.adwin.getEstimation());
        System.out.println(dfd.adwin.getBucketsUsed());
        System.out.println(dfd.adwin.getTotal());

    }
}


