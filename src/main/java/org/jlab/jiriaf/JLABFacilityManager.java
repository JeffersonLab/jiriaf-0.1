package org.jlab.jiriaf;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;

import java.io.*;
import java.net.URL;
import java.nio.charset.Charset;

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
public class JLABFacilityManager implements IFacilityManager{

    private final static String JLAB_RESOURCE_URL =
            "https://scicomp.jlab.org/scicomp2/farmNode2?type=all";
    private EFacility facility;

    public JLABFacilityManager(EFacility facility) {
        setFacility(facility);
    }

    @Override
    public void setFacility(EFacility facility) {
        this.facility = facility;
    }

    @Override
    public EFacility getFacility() {
        return facility;
    }

    @Override
    public void connect() {
    }

    @Override
    public void updateResourcePool() {

    }

    public void parseJLABJsonUrl(String url) throws IOException {
        try (InputStream is = new URL(url).openStream()) {
            BufferedReader rd = new BufferedReader(new InputStreamReader(is, Charset.forName("UTF-8")));
            String output;
            String output2 = "";
            while ((output = rd.readLine()) != null) {
                output2 += output;
            }
            JsonReader reader = new JsonReader(new StringReader(output2));

            JsonElement tree = JsonParser.parseReader(reader);
            JsonArray array = tree.getAsJsonArray();
            for (JsonElement element : array) {
                if (element.isJsonObject()) {
                    JsonObject job = element.getAsJsonObject();

                    System.out.println("********************");
                    System.out.println(job.get("name").getAsString());
                    System.out.println(job.get("state").getAsString());
                    System.out.println(job.get("cpu").getAsInt());
                    System.out.println(job.get("usedCpu").getAsInt());
                    System.out.println(job.get("usedMemory").getAsInt());
                    System.out.println(job.get("reqMemory").getAsInt());
                    System.out.println(job.get("totalMemory").getAsInt());
                    System.out.println(job.get("reserved").getAsString());
                }
            }
        }
    }

    public static void main(String[] args) {
        JLABFacilityManager jfm = new JLABFacilityManager(EFacility.JLAB);
        try {
            jfm.parseJLABJsonUrl(JLAB_RESOURCE_URL);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

}
