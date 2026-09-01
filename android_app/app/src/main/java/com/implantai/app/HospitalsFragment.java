package com.implantai.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.implantai.app.adapters.HospitalsAdapter;
import com.implantai.app.models.HospitalRecord;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class HospitalsFragment extends Fragment {

    private RecyclerView rvHospitals;
    private EditText etSearch;
    private Button btnNearMe;

    private final List<HospitalRecord> allHospitals = new ArrayList<>();
    private final List<HospitalRecord> displayedHospitals = new ArrayList<>();
    private HospitalsAdapter adapter;

    private double userLat = -1;
    private double userLng = -1;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_hospitals, container, false);

        rvHospitals = view.findViewById(R.id.rv_hospitals);
        etSearch = view.findViewById(R.id.et_hosp_search);
        btnNearMe = view.findViewById(R.id.btn_near_me);

        rvHospitals.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new HospitalsAdapter(requireContext(), displayedHospitals);
        rvHospitals.setAdapter(adapter);

        loadInitialDataset();

        btnNearMe.setOnClickListener(v -> detectUserLocationAndSort());

        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { filterHospitals(s.toString()); }
            @Override public void afterTextChanged(Editable s) {}
        });

        filterHospitals("");
        return view;
    }

    private void loadInitialDataset() {
        allHospitals.clear();
        allHospitals.add(new HospitalRecord(1, "Saveetha Dental & Maxillofacial Hospital", "Chennai", "+91 44 2680 1580", "+91 98410 23456", "162 Poonamallee High Rd, Chennai 600077", 13.0544, 80.0967, "🚨 24x7 Emergency Trauma Unit", "4.9 ⭐⭐⭐⭐⭐", "Oral & Maxillofacial Surgery"));
        allHospitals.add(new HospitalRecord(2, "Apollo Dental & Craniofacial Center", "Chennai", "+91 44 2829 0200", "1800 102 0288", "Greams Road, Thousand Lights, Chennai 600006", 13.0604, 80.2496, "🚨 24x7 Emergency Care", "4.8 ⭐⭐⭐⭐⭐", "3D Guided Implantology"));
        allHospitals.add(new HospitalRecord(3, "Government Dental College & Research Institute", "Bengaluru", "+91 80 2670 5053", "+91 80 2670 1599", "Victoria Hospital Complex, Fort Road, Bengaluru 560002", 12.9610, 77.5750, "🚨 24x7 Emergency Trauma", "4.8 ⭐⭐⭐⭐⭐", "Maxillofacial Trauma"));
        allHospitals.add(new HospitalRecord(4, "Manipal Hospital Dental & Maxillofacial Center", "Bengaluru", "+91 80 2502 4444", "1800 102 5555", "98 HAL Old Airport Road, Bengaluru 560017", 12.9592, 77.6496, "🚨 24x7 Casualty", "4.9 ⭐⭐⭐⭐⭐", "Guided Implantology"));
        allHospitals.add(new HospitalRecord(5, "Government Dental College & Hospital", "Hyderabad", "+91 40 2460 0147", "+91 40 2460 0148", "Afzalgunj, High Court Road, Hyderabad 500012", 17.3688, 78.4735, "🚨 24x7 Govt Trauma Wing", "4.7 ⭐⭐⭐⭐⭐", "Maxillofacial Reconstruction"));
        allHospitals.add(new HospitalRecord(6, "Apollo Health City Dental & Implant Institute", "Hyderabad", "+91 40 2360 7777", "1860 500 1066", "Jubilee Hills, Hyderabad 500033", 17.4165, 78.4116, "🚨 24x7 Dental ICU", "4.9 ⭐⭐⭐⭐⭐", "All-on-4 Implants"));
        allHospitals.add(new HospitalRecord(7, "Government Dental College & Hospital (GDC Mumbai)", "Mumbai", "+91 22 2262 0668", "+91 22 2262 0669", "St. George Hospital Compound, Fort, Mumbai 400001", 18.9402, 72.8354, "🚨 24x7 Casualty Center", "4.8 ⭐⭐⭐⭐⭐", "Craniofacial Trauma"));
        allHospitals.add(new HospitalRecord(8, "Maulana Azad Institute of Dental Sciences (MAIDS)", "Delhi", "+91 11 2323 3925", "+91 11 2323 3926", "BSZ Marg, LNJP Hospital Complex, New Delhi 110002", 28.6360, 77.2405, "🚨 24x7 National Trauma Center", "4.9 ⭐⭐⭐⭐⭐", "Apex Maxillofacial Surgery"));
        allHospitals.add(new HospitalRecord(9, "AIIMS Center for Dental Education & Research (CDER)", "Delhi", "+91 11 2658 8500", "+91 11 2659 4800", "Ansari Nagar East, New Delhi 110029", 28.5672, 77.2100, "🚨 24x7 AIIMS Emergency Care", "4.9 ⭐⭐⭐⭐⭐", "Zygomatic Implants"));
    }

    private void filterHospitals(String query) {
        displayedHospitals.clear();
        String q = query.toLowerCase().trim();
        for (HospitalRecord h : allHospitals) {
            if (q.isEmpty() || h.getName().toLowerCase().contains(q) || h.getCity().toLowerCase().contains(q) || h.getAddress().toLowerCase().contains(q)) {
                displayedHospitals.add(h);
            }
        }
        adapter.notifyDataSetChanged();
    }

    private void detectUserLocationAndSort() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 100);
            return;
        }

        try {
            LocationManager lm = (LocationManager) requireContext().getSystemService(Context.LOCATION_SERVICE);
            Location loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (loc == null) loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);

            if (loc != null) {
                userLat = loc.getLatitude();
                userLng = loc.getLongitude();

                for (HospitalRecord h : allHospitals) {
                    double dist = calculateHaversine(userLat, userLng, h.getLat(), h.getLng());
                    h.setDistanceKm(dist);
                }

                Collections.sort(allHospitals, Comparator.comparingDouble(HospitalRecord::getDistanceKm));
                filterHospitals(etSearch.getText().toString());
                Toast.makeText(requireContext(), "📍 Sorted by nearest to your GPS location!", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(requireContext(), "GPS signal acquiring... Showing all hospitals.", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(requireContext(), "Location notice: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
