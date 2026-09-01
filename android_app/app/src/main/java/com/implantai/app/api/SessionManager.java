package com.implantai.app.api;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {
    private static final String PREF_NAME = "ImplantAISession";
    private static final String KEY_IS_LOGGED_IN = "isLoggedIn";
    private static final String KEY_USER_ROLE = "userRole";
    private static final String KEY_USER_EMAIL = "userEmail";
    private static final String KEY_USER_NAME = "userName";
    private static final String KEY_SESSION_COOKIE = "sessionCookie";
    private static final String KEY_BASE_URL = "baseUrl";

    public static final String DEFAULT_BASE_URL = "https://implant-prediction.onrender.com";

    private final SharedPreferences pref;
    private final SharedPreferences.Editor editor;

    public SessionManager(Context context) {
        pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        editor = pref.edit();
    }

    public void setLogin(boolean isLoggedIn, String role, String email, String name) {
        editor.putBoolean(KEY_IS_LOGGED_IN, isLoggedIn);
        editor.putString(KEY_USER_ROLE, role);
        editor.putString(KEY_USER_EMAIL, email);
        editor.putString(KEY_USER_NAME, name);
        editor.apply();
    }

    public boolean isLoggedIn() {
        return pref.getBoolean(KEY_IS_LOGGED_IN, false);
    }

    public String getUserRole() {
        return pref.getString(KEY_USER_ROLE, "doctor");
    }

    public boolean isDoctor() {
        return "doctor".equalsIgnoreCase(getUserRole());
    }

    public String getUserEmail() {
        return pref.getString(KEY_USER_EMAIL, "");
    }

    public String getUserName() {
        return pref.getString(KEY_USER_NAME, "User");
    }

    public void setSessionCookie(String cookie) {
        editor.putString(KEY_SESSION_COOKIE, cookie);
        editor.apply();
    }

    public String getSessionCookie() {
        return pref.getString(KEY_SESSION_COOKIE, "");
    }

    public void setBaseUrl(String url) {
        if (url != null && !url.trim().isEmpty()) {
            String u = url.trim();
            if (u.endsWith("/")) u = u.substring(0, u.length() - 1);
            editor.putString(KEY_BASE_URL, u);
            editor.apply();
        }
    }

    public String getBaseUrl() {
        return pref.getString(KEY_BASE_URL, DEFAULT_BASE_URL);
    }

    public void clearSession() {
        editor.clear();
        editor.apply();
    }
}
