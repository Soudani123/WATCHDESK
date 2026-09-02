package com.watchdesk.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class LocalWindowsInventory {

    @Autowired
    private ObjectMapper objectMapper;

    public Map<String, Object> collectAll() {
        Map<String, Object> out = new HashMap<>();
        out.put("software", List.of());
        out.put("hotfixes", List.of());
        out.put("caption", "");
        out.put("build", "");
        if (!System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")) {
            return out;
        }
        String script = String.join("; ",
                "$ErrorActionPreference='SilentlyContinue'",
                "$map=@{}",
                "@('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*') | ForEach-Object { Get-ItemProperty $_ | ForEach-Object { if ($_.DisplayName) { $n=($_.DisplayName).Trim(); if (-not $map.ContainsKey($n)) { $map[$n]=@{ name=$n; version=([string]$_.DisplayVersion).Trim(); publisher=([string]$_.Publisher).Trim() } } } } }",
                "$hf=@(); Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 12 | ForEach-Object { $hf += @{ title=('Correctif Windows installé ' + $_.HotFixID); kb=$_.HotFixID; security=$true; installed=$true } }",
                "$o=Get-CimInstance Win32_OperatingSystem",
                "@{ software=@($map.Values); hotfixes=$hf; caption=$o.Caption; build=[string]$o.BuildNumber } | ConvertTo-Json -Compress -Depth 5"
        );
        try {
            Process p = start(script);
            String json = readAll(p);
            if (!p.waitFor(60, TimeUnit.SECONDS) || json == null) {
                return out;
            }
            int startObj = json.indexOf('{');
            if (startObj < 0) {
                return out;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(json.substring(startObj), Map.class);
            out.put("software", toMapList(parsed.get("software")));
            out.put("hotfixes", toMapList(parsed.get("hotfixes")));
            out.put("caption", String.valueOf(parsed.getOrDefault("caption", "")));
            out.put("build", String.valueOf(parsed.getOrDefault("build", "")));
        } catch (Exception e) {
            System.err.println("Inventaire Windows local : " + e.getMessage());
        }
        return out;
    }

    private List<Map<String, Object>> toMapList(Object raw) {
        List<Map<String, Object>> rows = new ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    m.forEach((k, v) -> row.put(String.valueOf(k), v));
                    rows.add(row);
                }
            }
        } else if (raw instanceof Map<?, ?> m) {
            Map<String, Object> row = new LinkedHashMap<>();
            m.forEach((k, v) -> row.put(String.valueOf(k), v));
            rows.add(row);
        }
        return rows;
    }

    private Process start(String script) throws Exception {
        return new ProcessBuilder("powershell", "-NoProfile", "-NonInteractive", "-Command", script)
                .redirectErrorStream(true)
                .start();
    }

    private String readAll(Process p) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }
}
