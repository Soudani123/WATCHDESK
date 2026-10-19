package com.watchdesk.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * Génération et vérification de codes TOTP (RFC 6238) compatibles
 * Google Authenticator / Microsoft Authenticator : HMAC-SHA1, 6 chiffres, pas de 30 s.
 */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int SECRET_BYTES = 20;
    private static final int DIGITS = 6;
    private static final int PERIOD_SECONDS = 30;
    /** ±2 pas (90 s) : absorbe le décalage d'horloge téléphone / serveur cloud. */
    private static final int WINDOW = 2;
    private final String issuer;
    private final SecureRandom random = new SecureRandom();

    /** Pour les tests unitaires (issuer prod par défaut). */
    public TotpService() {
        this("WatchDesk", "");
    }

    @Autowired
    public TotpService(
            @Value("${watchdesk.auth.totp-issuer:}") String issuer,
            @Value("${spring.datasource.url:}") String datasourceUrl) {
        this.issuer = resolveIssuer(issuer, datasourceUrl);
    }

    public String getIssuer() {
        return issuer;
    }

    static String resolveIssuer(String configured, String datasourceUrl) {
        if (configured != null && !configured.isBlank()) return configured.trim();
        String url = datasourceUrl == null ? "" : datasourceUrl.toLowerCase();
        if (url.contains("localhost") || url.contains("127.0.0.1")) return "WatchDesk-Local";
        return "WatchDesk";
    }

    public String generateSecret() {
        byte[] buffer = new byte[SECRET_BYTES];
        random.nextBytes(buffer);
        return base32Encode(buffer);
    }

    /** URI otpauth : issuer et compte encodés séparément, deux-points littéral (spec Google). */
    public String buildOtpAuthUri(String email, String secret) {
        String issuer = URLEncoder.encode(this.issuer, StandardCharsets.UTF_8);
        String account = URLEncoder.encode(email == null ? "" : email, StandardCharsets.UTF_8).replace("+", "%20");
        return "otpauth://totp/" + issuer + ":" + account
                + "?secret=" + secret
                + "&issuer=" + issuer
                + "&algorithm=SHA1"
                + "&digits=" + DIGITS
                + "&period=" + PERIOD_SECONDS;
    }

    public boolean verifyCode(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null) return false;

        String normalized = code.trim().replaceAll("\\s", "");
        if (!normalized.matches("\\d{" + DIGITS + "}")) return false;

        byte[] key;
        try {
            key = base32Decode(secret);
        } catch (IllegalArgumentException e) {
            return false;
        }

        long counter = System.currentTimeMillis() / 1000L / PERIOD_SECONDS;
        for (int offset = -WINDOW; offset <= WINDOW; offset++) {
            String expected = generateCode(key, counter + offset);
            // Comparaison à temps constant : évite de révéler le code par le temps de réponse
            if (expected != null && java.security.MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    normalized.getBytes(StandardCharsets.UTF_8))) {
                return true;
            }
        }
        return false;
    }

    private String generateCode(byte[] key, long counter) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            return String.format("%0" + DIGITS + "d", binary % (int) Math.pow(10, DIGITS));
        } catch (Exception e) {
            return null;
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                out.append(BASE32_ALPHABET.charAt((buffer >> (bitsLeft - 5)) & 0x1F));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            out.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }
        return out.toString();
    }

    private byte[] base32Decode(String encoded) {
        String clean = encoded.trim().replace("=", "").replace(" ", "").toUpperCase();
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;
        for (char c : clean.toCharArray()) {
            int value = BASE32_ALPHABET.indexOf(c);
            if (value < 0) throw new IllegalArgumentException("Secret TOTP invalide : " + c);
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out.toByteArray();
    }
}
