package com.implantai.app;

import android.os.Bundle;
import android.os.Environment;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.implantai.app.adapters.HistoryAdapter;
import com.implantai.app.api.ApiClient;
import com.implantai.app.models.EvaluationRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class HistoryFragment extends Fragment {

    private RecyclerView rvHistory;
    private SwipeRefreshLayout swipeRefresh;
    private EditText etSearch;

    private ApiClient apiClient;
    private final List<EvaluationRecord> allRecords = new ArrayList<>();
    private final List<EvaluationRecord> displayedRecords = new ArrayList<>();
    private HistoryAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_history, container, false);

        apiClient = new ApiClient(requireContext());

        rvHistory = view.findViewById(R.id.rv_history);
        swipeRefresh = view.findViewById(R.id.swipe_refresh);
        etSearch = view.findViewById(R.id.et_history_search);

        rvHistory.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new HistoryAdapter(requireContext(), displayedRecords, new HistoryAdapter.OnHistoryActionListener() {
            @Override
            public void onDownloadPdf(EvaluationRecord record) {
                downloadPdfReport(record);
            }

            @Override
            public void onDeleteRecord(EvaluationRecord record) {
                deleteRecord(record);
            }
        });
        rvHistory.setAdapter(adapter);

        swipeRefresh.setOnRefreshListener(this::fetchHistory);

        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { filterHistory(s.toString()); }
            @Override public void afterTextChanged(Editable s) {}
        });

        fetchHistory();
        return view;
    }

    private void fetchHistory() {
        swipeRefresh.setRefreshing(true);
        apiClient.get("/get_history", new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                swipeRefresh.setRefreshing(false);
                allRecords.clear();
                JSONArray arr = response.optJSONArray("data_array");
                if (arr != null) {
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.optJSONObject(i);
                        if (obj != null) allRecords.add(new EvaluationRecord(obj));
                    }
                }
                filterHistory(etSearch.getText().toString());
            }

            @Override
            public void onError(String errorMessage) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(requireContext(), "Failed to load history: " + errorMessage, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void filterHistory(String query) {
        displayedRecords.clear();
        String q = query.toLowerCase().trim();
        for (EvaluationRecord r : allRecords) {
            if (q.isEmpty() || r.getPatientName().toLowerCase().contains(q) || r.getPatientId().toLowerCase().contains(q)) {
                displayedRecords.add(r);
            }
        }
        adapter.notifyDataSetChanged();
    }

    private void downloadPdfReport(EvaluationRecord record) {
        Toast.makeText(requireContext(), "Downloading PDF for " + record.getPatientName() + "...", Toast.LENGTH_SHORT).show();

        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        String fileName = "ImplantAI_Report_" + record.getPatientName().replaceAll("\\s+", "_") + "_" + record.getPatientId() + ".pdf";
        File targetFile = new File(downloadsDir, fileName);

        apiClient.downloadPdf("/generate_pdf", record.getRawJson(), targetFile, new ApiClient.FileDownloadCallback() {
            @Override
            public void onSuccess(File downloadedFile) {
                Toast.makeText(requireContext(), "✅ Saved to Downloads: " + downloadedFile.getName(), Toast.LENGTH_LONG).show();
            }

            @Override
            public void onError(String errorMessage) {
                Toast.makeText(requireContext(), "❌ " + errorMessage, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void deleteRecord(EvaluationRecord record) {
        apiClient.delete("/delete_history/" + record.getId(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                Toast.makeText(requireContext(), "Record deleted.", Toast.LENGTH_SHORT).show();
                fetchHistory();
            }

            @Override
            public void onError(String errorMessage) {
                Toast.makeText(requireContext(), "Failed to delete: " + errorMessage, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
