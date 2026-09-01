package com.implantai.app;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.implantai.app.api.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

public class AnalyticsFragment extends Fragment {

    private TextView tvTotal, tvAvgScore, tvLowRisk, tvMedRisk, tvHighRisk;
    private ApiClient apiClient;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_analytics, container, false);

        apiClient = new ApiClient(requireContext());

        tvTotal = view.findViewById(R.id.tv_stat_total);
        tvAvgScore = view.findViewById(R.id.tv_stat_avg_score);
        tvLowRisk = view.findViewById(R.id.tv_low_risk_count);
        tvMedRisk = view.findViewById(R.id.tv_med_risk_count);
        tvHighRisk = view.findViewById(R.id.tv_high_risk_count);

        loadAnalyticsData();
        return view;
    }

    private void loadAnalyticsData() {
        apiClient.get("/get_history", new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                JSONArray arr = response.optJSONArray("data_array");
                if (arr == null) return;

                int total = arr.length();
                double sumScore = 0;
                int low = 0, med = 0, high = 0;

                for (int i = 0; i < total; i++) {
                    JSONObject obj = arr.optJSONObject(i);
                    if (obj != null) {
                        double s = obj.optDouble("score", 50.0);
                        sumScore += s;
                        if (s >= 90.0) low++;
                        else if (s >= 80.0) med++;
                        else high++;
                    }
                }

                double avg = total > 0 ? (sumScore / total) : 0;

                tvTotal.setText(String.valueOf(total));
                tvAvgScore.setText(String.format("%.1f%%", avg));

                tvLowRisk.setText(String.format("🟢 Low Risk (>=90%%): %d patients", low));
                tvMedRisk.setText(String.format("🟠 Medium Risk (80-89%%): %d patients", med));
                tvHighRisk.setText(String.format("🔴 High Risk (<80%%): %d patients", high));
            }

            @Override
            public void onError(String errorMessage) {
                Toast.makeText(requireContext(), "Failed to load analytics: " + errorMessage, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
