package com.implantai.app;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.implantai.app.api.SessionManager;

public class HomeFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);

        SessionManager sessionManager = new SessionManager(requireContext());
        TextView tvWelcomeTitle = view.findViewById(R.id.tv_welcome_title);
        tvWelcomeTitle.setText("👋 Welcome, " + sessionManager.getUserName() + "!");

        BottomNavigationView nav = requireActivity().findViewById(R.id.bottom_navigation);

        view.findViewById(R.id.card_action_predict).setOnClickListener(v -> {
            if (nav != null) nav.setSelectedItemId(R.id.nav_predict);
        });

        view.findViewById(R.id.card_action_history).setOnClickListener(v -> {
            if (nav != null) nav.setSelectedItemId(R.id.nav_history);
        });

        view.findViewById(R.id.card_action_hospitals).setOnClickListener(v -> {
            if (nav != null) nav.setSelectedItemId(R.id.nav_hospitals);
        });

        view.findViewById(R.id.card_action_profile).setOnClickListener(v -> {
            if (nav != null) nav.setSelectedItemId(R.id.nav_profile);
        });

        return view;
    }
}
