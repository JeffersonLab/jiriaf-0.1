package org.jlab.jiriaf;

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

    public JDriftDetector() {
        adwin = new ADWIN();
    }

    /**
     *
     * @param event from a stream
     * @return true if drift is detected
     */
    public boolean isChanged(int event) {
        return adwin.setInput(event);
    }

    public void input(double inputValue) {
        if (adwin == null) {
            resetLearning();
        }
        double ErrEstim = this.adwin.getEstimation();
        if(adwin.setInput(inputValue)) {
            if (adwin.getEstimation() > ErrEstim) {
                this.isChangeDetected = true;
            }
        }
        this.isWarningZone = false;
        this.delay = 0.0;
        this.estimation = adwin.getEstimation();
    }
}
