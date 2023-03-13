package org.jlab.jiriaf;

/**
 * Copyright (c) 2021, Jefferson Science Associates, all rights reserved.
 * See LICENSE.txt file.
 * Thomas Jefferson National Accelerator Facility
 * Experimental Physics Software and Computing Infrastructure Group
 * 12000, Jefferson Ave, Newport News, VA 23606
 * Phone : (757)-269-7100
 *
 * @author gurjyan on 3/3/23
 * @project jiriaf-0.1
 */
public interface IFacilityManager {

public void setFacility (EFacility facility);
public EFacility getFacility();
public void connect();
public void updateResourcePool();


}
