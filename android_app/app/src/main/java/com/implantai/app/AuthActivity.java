package com.implantai.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.implantai.app.api.ApiClient;
import com.implantai.app.api.SessionManager;

import org.json.JSONObject;

public class AuthActivity extends AppCompatActivity {

    private EditText etUsername, etPassword, etBaseUrl;
    private Button btnLogin, btnRoleDoctor, btnRolePatient;
    private ProgressBar progressBar;
    private TextView tvStatus;

    private ApiClient apiClient;
    private SessionManager sessionManager;
    private String selectedRole = "doctor";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        sessionManager = new SessionManager(this);
        apiClient = new ApiClient(this);

        if (sessionManager.isLoggedIn()) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }

        setContentView(R.layout.activity_auth);

        etUsername = findViewById(R.id.et_username);
        etPassword = findViewById(R.id.et_password);
        etBaseUrl = findViewById(R.id.et_base_url);
        btnLogin = findViewById(R.id.btn_login);
        btnRoleDoctor = findViewById(R.id.btn_role_doctor);
        btnRolePatient = findViewById(R.id.btn_role_patient);
        progressBar = findViewById(R.id.progress_bar);
        tvStatus = findViewById(R.id.tv_status);

        etBaseUrl.setText(sessionManager.getBaseUrl());

        btnRoleDoctor.setOnClickListener(v -> selectRole("doctor"));
        btnRolePatient.setOnClickListener(v -> selectRole("patient"));

        btnLogin.setOnClickListener(v -> performLogin());
    }

    private void selectRole(String role) {
        this.selectedRole = role;
        if ("doctor".equals(role)) {
            btnRoleDoctor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF1E2D3C));
            btnRolePatient.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF64748B));
        } else {
            btnRolePatient.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF27AE60));
            btnRoleDoctor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF64748B));
        }
    }

    private void performLogin() {
        String username = etUsername.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String serverUrl = etBaseUrl.getText().toString().trim();

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter username and password.", Toast.LENGTH_SHORT).show();
            return;
        }

        sessionManager.setBaseUrl(serverUrl);
        progressBar.setVisibility(View.VISIBLE);
        btnLogin.setEnabled(false);
        tvStatus.setVisibility(View.GONE);

        try {
            JSONObject body = new JSONObject();
            body.put("username", username);
            body.put("password", password);
            body.put("role", selectedRole);

            apiClient.post("/auth/login", body, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(JSONObject response) {
                    progressBar.setVisibility(View.GONE);
                    btnLogin.setEnabled(true);

                    String role = response.optString("role", selectedRole);
                    String email = response.optString("email", username);
                    String name = response.optString("name", username);

                    sessionManager.setLogin(true, role, email, name);
                    Toast.makeText(AuthActivity.this, "Welcome " + name + "!", Toast.LENGTH_SHORT).show();

                    startActivity(new Intent(AuthActivity.this, MainActivity.class));
                    finish();
                }

                @Override
                public void onError(String errorMessage) {
                    progressBar.setVisibility(View.GONE);
                    btnLogin.setEnabled(true);
                    tvStatus.setText("❌ " + errorMessage);
                    tvStatus.setVisibility(View.VISIBLE);
                }
            });

        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            btnLogin.setEnabled(true);
            Toast.makeText(this, "Error: " + e.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
        }
    }
}
