package com.implantai.app.api;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApiClient {
    private static final String TAG = "ApiClient";
    private final SessionManager sessionManager;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ApiCallback {
        void onSuccess(JSONObject response);
        void onError(String errorMessage);
    }

    public interface FileDownloadCallback {
        void onSuccess(File downloadedFile);
        void onError(String errorMessage);
    }

    public ApiClient(Context context) {
        this.sessionManager = new SessionManager(context);
    }

    public void post(String endpoint, JSONObject jsonBody, ApiCallback callback) {
        request("POST", endpoint, jsonBody, callback);
    }

    public void get(String endpoint, ApiCallback callback) {
        request("GET", endpoint, null, callback);
    }

    public void delete(String endpoint, ApiCallback callback) {
        request("DELETE", endpoint, null, callback);
    }

    private void request(String method, String endpoint, JSONObject body, ApiCallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String fullUrl = sessionManager.getBaseUrl() + endpoint;
                URL url = new URL(fullUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");

                String cookie = sessionManager.getSessionCookie();
                if (cookie != null && !cookie.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookie);
                }

                if (body != null && ("POST".equals(method) || "PUT".equals(method))) {
                    conn.setDoOutput(true);
                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes("UTF-8"));
                    os.flush();
                    os.close();
                }

                Map<String, List<String>> headerFields = conn.getHeaderFields();
                List<String> cookiesHeader = headerFields.get("Set-Cookie");
                if (cookiesHeader != null) {
                    for (String c : cookiesHeader) {
                        if (c.startsWith("session=")) {
                            sessionManager.setSessionCookie(c.split(";")[0]);
                            break;
                        }
                    }
                }

                int statusCode = conn.getResponseCode();
                InputStream is = (statusCode >= 200 && statusCode < 300) ? conn.getInputStream() : conn.getErrorStream();

                BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                String rawResponse = sb.toString();
                if (statusCode >= 200 && statusCode < 300) {
                    JSONObject resObj;
                    if (rawResponse.trim().startsWith("[")) {
                        resObj = new JSONObject();
                        resObj.put("data_array", new org.json.JSONArray(rawResponse));
                        resObj.put("status", "success");
                    } else {
                        resObj = new JSONObject(rawResponse);
                    }
                    mainHandler.post(() -> callback.onSuccess(resObj));
                } else {
                    String errMessage = "Server returned status code: " + statusCode;
                    try {
                        JSONObject errJson = new JSONObject(rawResponse);
                        if (errJson.has("message")) errMessage = errJson.getString("message");
                    } catch (Exception ignored) {}
                    String finalErr = errMessage;
                    mainHandler.post(() -> callback.onError(finalErr));
                }

            } catch (Exception e) {
                Log.e(TAG, "Network request error", e);
                mainHandler.post(() -> callback.onError("Network connection failure: " + e.getLocalizedMessage()));
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    public void downloadPdf(String endpoint, JSONObject jsonBody, File outputFile, FileDownloadCallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String fullUrl = sessionManager.getBaseUrl() + endpoint;
                URL url = new URL(fullUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");

                String cookie = sessionManager.getSessionCookie();
                if (cookie != null && !cookie.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookie);
                }

                conn.setDoOutput(true);
                OutputStream os = conn.getOutputStream();
                os.write(jsonBody.toString().getBytes("UTF-8"));
                os.flush();
                os.close();

                int statusCode = conn.getResponseCode();
                if (statusCode >= 200 && statusCode < 300) {
                    InputStream is = conn.getInputStream();
                    FileOutputStream fos = new FileOutputStream(outputFile);
                    byte[] buffer = new byte[4096];
                    int len;
                    while ((len = is.read(buffer)) != -1) {
                        fos.write(buffer, 0, len);
                    }
                    fos.close();
                    is.close();

                    mainHandler.post(() -> callback.onSuccess(outputFile));
                } else {
                    mainHandler.post(() -> callback.onError("Failed to download PDF. Server HTTP " + statusCode));
                }

            } catch (Exception e) {
                Log.e(TAG, "PDF Download Error", e);
                mainHandler.post(() -> callback.onError("Download error: " + e.getLocalizedMessage()));
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }
}
