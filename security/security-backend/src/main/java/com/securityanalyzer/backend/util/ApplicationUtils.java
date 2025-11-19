package com.securityanalyzer.backend.util;

import com.google.common.collect.Table;
import com.google.gson.Gson;
import com.securityanalyzer.backend.entity.Constant;
import com.securityanalyzer.backend.entity.Vulnerability;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;


import java.io.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;

public class ApplicationUtils {

    private static Logger logger = (Logger) LoggerFactory.getLogger(ApplicationUtils.class);

    /**
     * The serializeList method serializes the collection Table and write it to the text file
     */
    public static void serializeList(Table<String,String,ArrayList<Vulnerability>> tree, String portalName,String branchName) {


        try {
            FileOutputStream fileOutput = new FileOutputStream("vulnerabilities.txt");
            ObjectOutputStream output = null;
            output = new ObjectOutputStream(fileOutput);
            output.writeObject(tree);
            output.close();
            fileOutput.close();
            logger.info("Serialized vulnerability data saved for portal: {}, branch: {}", portalName, branchName);
        } catch (FileNotFoundException e) {
            logger.error("File not found while serializing data for portal: {}, branch: {}", portalName,
                    branchName, e);
        } catch (IOException e) {
            logger.error("IO error while serializing data for portal: {}, branch: {}", portalName, branchName,
                    e);
        }
    }

    /**
     * The deserializeList method deserializes the collection Table  written in text file and returns a Table */
    public static Table<String,String,ArrayList<Vulnerability>> deSerializeList(String portalName,String branchName) {

        Table<String,String,ArrayList<Vulnerability>> table = null;

        try {
            FileInputStream fileInput = new FileInputStream(Constant.TEXT_FILE_NAME);
            ObjectInputStream input = new ObjectInputStream(fileInput);
            table=(Table<String,String,ArrayList<Vulnerability>>) input.readObject();
            input.close();
            fileInput.close();
            logger.info("Deserialized vulnerability data retrieved for portal: {}, branch: {}", portalName, branchName);
        } catch (FileNotFoundException e) {

            logger.warn("Vulnerability data file not found. Application may be running for the first time");
            return null;
        } catch (IOException e) {
            logger.error("IO error while deserializing data for portal: {}, branch: {}", portalName, branchName,
                    e);
        } catch (ClassNotFoundException e) {
            logger.error("Class not found while deserializing data for portal: {}, branch: {}", portalName,
                    branchName, e);
        }
        return table;
    }

    /**
     * The checkExistenceOfVulnerabilityInTheList method loops through the list and check whether is there any instance with the same id of given Vulnerability V.
     */
    private static boolean checkExistenceOfVulnerabilityInTheList(ArrayList<Vulnerability> list, Vulnerability v) {

        for (int i = 0; i < list.size(); i++) {
            if (v.getId().equals(list.get(i).getId()) && v.getFrom().equals(list.get(i).getFrom())) {
                return true;
            }
        }
        return false;
    }
/**
 * The getVulnerabilityListFromJSON generates an ArrayList of Vulnerability Objects from the JSON file of the specific portal and branch from Snyk
 * */
    public static ArrayList<Vulnerability> getVulnerabilityListFromJSON(String portalName,String branchName) throws FileNotFoundException {

        String text = null;
        String path="";
        Vulnerability v;
        Gson gson = new Gson();
        ArrayList<Vulnerability> vulnerabilities = new ArrayList<>();
        byte[] resource = null;

        try {
            if (branchName.equals("main")){
                 path = String.format("%s.json", portalName);
            }else{
                 path = String.format("%s_%s.json", portalName,branchName);
            }

            if (logger.isDebugEnabled()) {
                logger.debug("Reading JSON file: " + path);
            }
            FileInputStream fileInput = new FileInputStream(path);
            resource = fileInput.readAllBytes();
            text = new String(resource);
        } catch (FileNotFoundException e) {
            logger.error("JSON file not found: {} for portal: {}, branch: {}", path, portalName, branchName);
            throw e;




        } catch (IOException e) {
            logger.error("IO error while reading JSON file: {}", path, e);
        }

        JSONObject jsonDocument = (JSONObject) JSONValue.parse(text);
        HashMap<String, Object> map = new HashMap<>();
        Iterator<String> iter = jsonDocument.keySet().iterator();
        while (iter.hasNext()) {
            String key = iter.next();
            map.put(key, jsonDocument.get(key));
        }

        ArrayList<Object> vulns = (ArrayList<Object>) map.get("vulnerabilities");
        Iterator it = vulns.iterator();
        while (it.hasNext()) {

            v = gson.fromJson(String.valueOf(it.next()), Vulnerability.class);



            if (v.getState() == null) {
                v.setState("new");
            }
            vulnerabilities.add(v);

        }
        if (logger.isDebugEnabled()) {
            logger.debug("Parsed {} vulnerabilities from JSON for portal: {}", vulnerabilities.size(),
                    portalName);
        }
        return vulnerabilities;
    }

    /**
     * The addNewlyIdentifiedVulnerabilities method add any new vulnerabilities that are received from the json to the ArrayList that we got from deserializing the text file.
     * */
    public static void addNewlyIdentifiedVulnerabilities(ArrayList<Vulnerability> vulnerabilities, ArrayList<Vulnerability> oldList) {

        for (int counter = 0; counter < vulnerabilities.size(); counter++) {
            if (checkExistenceOfVulnerabilityInTheList(oldList, vulnerabilities.get(counter)))
                continue;
            else

                oldList.add(vulnerabilities.get(counter));
        }

    }
    /**
     * The removeFalsePositives method remove any vulnerabilities that are existing in the deserialized ArrayList and not existing in the ArrayList got from JSON file.
     * */
    public static ArrayList<Vulnerability> removeFalsePositives(ArrayList<Vulnerability> vulnerabilities, ArrayList<Vulnerability> oldList) {

        ArrayList<Vulnerability> newList = new ArrayList<Vulnerability>();
        for (int counter = 0; counter < oldList.size(); counter++) {

            if (checkExistenceOfVulnerabilityInTheList(vulnerabilities, oldList.get(counter)))
                newList.add(oldList.get(counter));

            else
                continue;

        }
        return newList;

    }

}


