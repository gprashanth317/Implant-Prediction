package com.implantai.app.models;

public class HospitalRecord {
    private int id;
    private String name;
    private String city;
    private String phone;
    private String altPhone;
    private String address;
    private double lat;
    private double lng;
    private String emergency;
    private String rating;
    private String specialties;
    private double distanceKm = -1;

    public HospitalRecord(int id, String name, String city, String phone, String altPhone, String address, double lat, double lng, String emergency, String rating, String specialties) {
        this.id = id;
        this.name = name;
        this.city = city;
        this.phone = phone;
        this.altPhone = altPhone;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
        this.emergency = emergency;
        this.rating = rating;
        this.specialties = specialties;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getPhone() { return phone; }
    public String getAltPhone() { return altPhone; }
    public String getAddress() { return address; }
    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public String getEmergency() { return emergency; }
    public String getRating() { return rating; }
    public String getSpecialties() { return specialties; }
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double distanceKm) { this.distanceKm = distanceKm; }
}
