package com.implantai.app;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioGroup;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;

import com.implantai.app.api.ApiClient;

import org.json.JSONObject;

public class PredictionFragment extends Fragment {

    private EditText etName, etId, etAge, etLength, etDiameter;
    private Spinner spSmoking, spHygiene, spBoneQuality, spJawLocation, spSurface;
    private RadioGroup rgDiabetes, rgPeriodontitis, rgBruxism;
    private Button btnSubmit;

    private CardView cardResult;
    private TextView tvResultScore, tvResultCategory;

    private ApiClient apiClient;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_predict, container, false);

        apiClient = new ApiClient(requireContext());

        etName = view.findViewById(R.id.et_patient_name);
        etId = view.findViewById(R.id.et_patient_id);
        etAge = view.findViewById(R.id.et_age);
        etLength = view.findViewById(R.id.et_length);
        etDiameter = view.findViewById(R.id.et_diameter);

        spSmoking = view.findViewById(R.id.sp_smoking);
        spHygiene = view.findViewById(R.id.sp_hygiene);
        spBoneQuality = view.findViewById(R.id.sp_bone_quality);
        spJawLocation = view.findViewById(R.id.sp_jaw_location);
        spSurface = view.findViewById(R.id.sp_surface);

        rgDiabetes = view.findViewById(R.id.rg_diabetes);
        rgPeriodontitis = view.findViewById(R.id.rg_periodontitis);
        rgBruxism = view.findViewById(R.id.rg_bruxism);

        btnSubmit = view.findViewById(R.id.btn_predict_submit);
        cardResult = view.findViewById(R.id.card_result);
        tvResultScore = view.findViewById(R.id.tv_result_score);
        tvResultCategory = view.findViewById(R.id.tv_result_category);

        setupSpinners();

        btnSubmit.setOnClickListener(v -> submitPrediction());

        return view;
    }

    private void setupSpinners() {
        ArrayAdapter<String> adapterSmoking = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, new String[]{"Non-smoker", "Light Smoker (<10/day)", "Heavy Smoker (>=10/day)"});
        spSmoking.setAdapter(adapterSmoking);

        ArrayAdapter<String> adapterHygiene = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, new String[]{"Good", "Fair", "Poor"});
        spHygiene.setAdapter(adapterHygiene);

        ArrayAdapter<String> adapterBone = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, new String[]{"Type 1", "Type 2", "Type 3", "Type 4"});
        spBoneQuality.setAdapter(adapterBone);

        ArrayAdapter<String> adapterJaw = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, new String[]{"Mandible (Lower Jaw)", "Maxilla (Upper Jaw)"});
        spJawLocation.setAdapter(adapterJaw);

        ArrayAdapter<String> adapterSurface = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, new String[]{"Roughened (SLA/Anodized)", "Machined / Smooth", "TPS (Titanium Plasma)", "HA Coated"});
        spSurface.setAdapter(adapterSurface);
    }

    private void submitPrediction() {
        String name = etName.getText().toString().trim();
        String id = etId.getText().toString().trim();
        String ageStr = etAge.getText().toString().trim();
        String lengthStr = etLength.getText().toString().trim();
        String diamStr = etDiameter.getText().toString().trim();

        if (name.isEmpty() || id.isEmpty() || ageStr.isEmpty()) {
            Toast.makeText(requireContext(), "Please enter patient name, ID, and age.", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("patient_name", name);
            body.put("patient_id", id);
            body.put("age", Integer.parseInt(ageStr));
            body.put("gender", "Male");
            body.put("smoking_status", spSmoking.getSelectedItem().toString());
            body.put("diabetes", rgDiabetes.getCheckedRadioButtonId() == R.id.rb_diab_yes ? "yes" : "no");
            body.put("history_periodontitis", rgPeriodontitis.getCheckedRadioButtonId() == R.id.rb_perio_yes ? "yes" : "no");
            body.put("bruxism", rgBruxism.getCheckedRadioButtonId() == R.id.rb_brux_yes ? "yes" : "no");
            body.put("oral_hygiene", spHygiene.getSelectedItem().toString());
            body.put("bone_quality", spBoneQuality.getSelectedItem().toString());
            body.put("jaw_location", spJawLocation.getSelectedItem().toString());
            body.put("implant_length_mm", lengthStr.isEmpty() ? 10.0 : Double.parseDouble(lengthStr));
            body.put("implant_diameter_mm", diamStr.isEmpty() ? 4.0 : Double.parseDouble(diamStr));
            body.put("implant_surface", spSurface.getSelectedItem().toString());

            btnSubmit.setEnabled(false);
            apiClient.post("/predict", body, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(JSONObject response) {
                    btnSubmit.setEnabled(true);
                    double score = response.optDouble("survival_probability", 50.0);
                    tvResultScore.setText(String.format("%.1f%%", score));

                    String cat = "Low Risk (Excellent Prognosis)";
                    int color = 0xFF27AE60;
                    if (score < 80.0) {
                        cat = "High Risk Profile";
                        color = 0xFFC0392B;
                    } else if (score < 90.0) {
                        cat = "Medium Risk (Moderate Prognosis)";
                        color = 0xFFE67E22;
                    }

                    tvResultCategory.setText("Category: " + cat);
                    tvResultCategory.setBackgroundColor(color);
                    cardResult.setVisibility(View.VISIBLE);
                }

                @Override
                public void onError(String errorMessage) {
                    btnSubmit.setEnabled(true);
                    Toast.makeText(requireContext(), "Prediction failed: " + errorMessage, Toast.LENGTH_SHORT).show();
                }
            });

        } catch (Exception e) {
            btnSubmit.setEnabled(true);
            Toast.makeText(requireContext(), "Error: " + e.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
        }
    }
}
