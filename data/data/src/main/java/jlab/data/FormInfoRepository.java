package jlab.data;

import java.sql.Connection;

import java.sql.DriverManager;

import java.sql.ResultSet;

import java.sql.Statement;

 

public class FormInfoRepository {

    private static final String JDBC_URL = "jdbc:mariadb://localhost:3306/jiriaf";

    private static final String USER = "jiriaf";

    private static final String PASSWORD = "dikala-twiga";

 

    public static void main(String[] args) {
    	System.out.println("working test main");
        try {

            // 1. Load the MariaDB driver

            Class.forName("org.mariadb.jdbc.Driver");

 

            // 2. Establish the connection

            Connection connection = DriverManager.getConnection(JDBC_URL, USER, PASSWORD);

 

           

            Statement stmt = connection.createStatement();

 

            stmt.executeUpdate("INSERT INTO sample_table (job_compute) VALUES ('cpu_core_count')");

 

          

            ResultSet rs = stmt.executeQuery("SELECT * FROM job_compute");

            while (rs.next()) {

                System.out.println("ID: " + rs.getInt("id") + ", Name: " + rs.getString("name"));

            }

 


           

            rs.close();

            stmt.close();

            connection.close();

 

        } catch (Exception e) {

            e.printStackTrace();

        }

    }

}