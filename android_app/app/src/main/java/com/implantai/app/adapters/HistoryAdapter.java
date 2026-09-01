package com.implantai.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.implantai.app.R;
import com.implantai.app.models.EvaluationRecord;
import java.util.List;

public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.ViewHolder> {
    private final List<EvaluationRecord> list;
    private final Context context;
    private final OnHistoryActionListener listener;

    public interface OnHistoryActionListener {
        void onDownloadPdf(EvaluationRecord record);
        void onDeleteRecord(EvaluationRecord record);
    }

    public HistoryAdapter(Context context, List<EvaluationRecord> list, OnHistoryActionListener listener) {
        this.context = context;
        this.list = list;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(context).inflate(R.layout.item_history, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        EvaluationRecord item = list.get(position);
        holder.tvPatientName.setText(item.getPatientName());
        holder.tvPatientId.setText("ID: " + item.getPatientId() + " | Date: " + item.getDate());
        holder.tvScore.setText(String.format("%.1f%%", item.getScore()));
        holder.tvRiskBadge.setText(item.getRiskCategory());
        holder.tvRiskBadge.setTextColor(item.getRiskColor());

        holder.tvSpecs.setText(String.format("Age/Gender: %d yrs / %s | Jaw: %s | Bone: %s
Implant: %s (%.1fmm x %.1fmm)",
                item.getAge(), item.getGender(), item.getJawLocation(), item.getBoneQuality(),
                item.getImplantSurface(), item.getImplantLength(), item.getImplantDiameter()));

        holder.btnPdf.setOnClickListener(v -> {
            if (listener != null) listener.onDownloadPdf(item);
        });

        holder.btnDelete.setOnClickListener(v -> {
            if (listener != null) listener.onDeleteRecord(item);
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvPatientName, tvPatientId, tvScore, tvRiskBadge, tvSpecs;
        Button btnPdf, btnDelete;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvPatientName = itemView.findViewById(R.id.tv_patient_name);
            tvPatientId = itemView.findViewById(R.id.tv_patient_id);
            tvScore = itemView.findViewById(R.id.tv_score);
            tvRiskBadge = itemView.findViewById(R.id.tv_risk_badge);
            tvSpecs = itemView.findViewById(R.id.tv_specs);
            btnPdf = itemView.findViewById(R.id.btn_pdf);
            btnDelete = itemView.findViewById(R.id.btn_delete);
        }
    }
}
