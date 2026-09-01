package com.implantai.app.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.implantai.app.R;
import com.implantai.app.models.HospitalRecord;
import java.util.List;

public class HospitalsAdapter extends RecyclerView.Adapter<HospitalsAdapter.ViewHolder> {
    private final List<HospitalRecord> list;
    private final Context context;

    public HospitalsAdapter(Context context, List<HospitalRecord> list) {
        this.context = context;
        this.list = list;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(context).inflate(R.layout.item_hospital, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        HospitalRecord item = list.get(position);
        holder.tvName.setText("🏥 " + item.getName());
        holder.tvAddress.setText("📍 " + item.getAddress());
        holder.tvEmergency.setText(item.getEmergency());
        holder.tvRating.setText(item.getRating() + " • " + item.getCity());

        if (item.getDistanceKm() >= 0) {
            if (item.getDistanceKm() < 1.0) {
                holder.tvDistance.setText(String.format("📍 %d m away", Math.round(item.getDistanceKm() * 1000)));
            } else {
                holder.tvDistance.setText(String.format("📍 %.1f km away", item.getDistanceKm()));
            }
            holder.tvDistance.setVisibility(View.VISIBLE);
        } else {
            holder.tvDistance.setVisibility(View.GONE);
        }

        holder.btnCall.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + item.getPhone().replaceAll("\s+", "")));
            context.startActivity(intent);
        });

        holder.btnRoute.setOnClickListener(v -> {
            String uriStr = String.format("https://www.google.com/maps/dir/?api=1&destination=%f,%f", item.getLat(), item.getLng());
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriStr));
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvAddress, tvEmergency, tvRating, tvDistance;
        Button btnCall, btnRoute;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvName = itemView.findViewById(R.id.tv_hosp_name);
            tvAddress = itemView.findViewById(R.id.tv_hosp_address);
            tvEmergency = itemView.findViewById(R.id.tv_hosp_emergency);
            tvRating = itemView.findViewById(R.id.tv_hosp_rating);
            tvDistance = itemView.findViewById(R.id.tv_hosp_distance);
            btnCall = itemView.findViewById(R.id.btn_hosp_call);
            btnRoute = itemView.findViewById(R.id.btn_hosp_route);
        }
    }
}
