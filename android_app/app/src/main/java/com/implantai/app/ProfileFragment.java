package com.implantai.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.implantai.app.api.ApiClient;
import com.implantai.app.api.SessionManager;

import org.json.JSONObject;

public class ProfileFragment extends Fragment {

    private TextView tvHeader, tvSub, tvField4Label, tvField5Label;
    private EditText etName, etPhone, etEmail, etField4, etField5;
    private Button btnSave, btnLogout;

    private ApiClient apiClient;
    private SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_profile, container, false);

        sessionManager = new SessionManager(requireContext());
        apiClient = new ApiClient(requireContext());

        tvHeader = view.findViewById(R.id.tv_profile_header);
        tvSub = view.findViewById(R.id.tv_profile_sub);
        tvField4Label = view.findViewById(R.id.tv_field_4_label);
        tvField5Label = view.findViewById(R.id.tv_field_5_label);

        etName = view.findViewById(R.id.et_profile_name);
        etPhone = view.findViewById(R.id.et_profile_phone);
        etEmail = view.findViewById(R.id.et_profile_email);
        etField4 = view.findViewById(R.id.et_profile_field4);
        etField5 = view.findViewById(R.id.et_profile_field5);

        btnSave = view.findViewById(R.id.btn_save_profile);
        btnLogout = view.findViewById(R.id.btn_logout);

        setupRoleLabels();
        loadProfileData();

        btnSave.setOnClickListener(v -> saveProfileData());
        btnLogout.setOnClickListener(v -> performLogout());

        return view;
    }

    private void setupRoleLabels() {
        if (sessionManager.isDoctor()) {
            tvHeader.setText("🩺 Doctor Profile");
            tvSub.setText("Medical Practitioner Credentials & Hospital Information");
            tvField4Label.setText("Clinic / Hospital Name");
            tvField5Label.setText("Medical License Number");
        } else {
            tvHeader.setText("👤 Patient Profile");
            tvSub.setText("Personal Health Profile & Family Contact Details");
            tvField4Label.setText("Father / Husband Name");
            tvField5Label.setText("Father / Husband Phone");
        }
    }

    private void loadProfileData() {
        apiClient.get("/get_profile", new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                etName.setText(response.optString("name", ""));
                etPhone.setText(response.optString("phone", ""));
                etEmail.setText(response.optString("email", ""));

                if (sessionManager.isDoctor()) {
                    etField4.setText(response.optString("clinic_name", ""));
                    etField5.setText(response.optString("license_number", ""));
                } else {
                    etField4.setText(response.optString("guardian_name", ""));
                    etField5.setText(response.optString("guardian_phone", ""));
                }
            }

            @Override
            public void onError(String errorMessage) {
                Toast.makeText(requireContext(), "Failed to load profile: " + errorMessage, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void saveProfileData() {
        try {
            JSONObject body = new JSONObject();
            body.put("name", etName.getText().toString().trim());
            body.put("phone", etPhone.getText().toString().trim());

            if (sessionManager.isDoctor()) {
                body.put("clinic_name", etField4.getText().toString().trim());
                body.put("license_number", etField5.getText().toString().trim());
            } else {
                body.put("guardian_name", etField4.getText().toString().trim());
                body.put("guardian_phone", etField5.getText().toString().trim());
            }

            btnSave.setEnabled(false);
            apiClient.post("/update_profile", body, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(JSONObject response) {
                    btnSave.setEnabled(true);
                    Toast.makeText(requireContext(), "✅ Profile saved successfully!", Toast.LENGTH_SHORT).show();
                }

                @Override
                public void onError(String errorMessage) {
                    btnSave.setEnabled(true);
                    Toast.makeText(requireContext(), "❌ " + errorMessage, Toast.LENGTH_SHORT).show();
                }
            });

        } catch (Exception e) {
            btnSave.setEnabled(true);
            Toast.makeText(requireContext(), "Error: " + e.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void performLogout() {
        apiClient.post("/auth/logout", new JSONObject(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                sessionManager.clearSession();
                startActivity(new Intent(requireContext(), AuthActivity.class));
                requireActivity().finish();
            }

            @Override
            public void onError(String errorMessage) {
                sessionManager.clearSession();
                startActivity(new Intent(requireContext(), AuthActivity.class));
                requireActivity().finish();
            }
        });
    }
}
