package com.watchdesk.backend.service;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;

import static org.junit.jupiter.api.Assertions.*;

class TotpServiceTest {

    private final TotpService totpService = new TotpService();

    /** Secret RFC 6238 ("12345678901234567890") encodé en Base32. */
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    @Test
    void generatedSecretIsBase32AndLongEnough() {
        String secret = totpService.generateSecret();
        assertEquals(32, secret.length());
        assertTrue(secret.matches("[A-Z2-7]+"), "Le secret doit être en Base32 : " + secret);
    }

    @Test
    void otpAuthUriCarriesIssuerAndSecret() {
        String uri = totpService.buildOtpAuthUri("sana@watchdesk.tn", RFC_SECRET);
        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + RFC_SECRET));
        assertTrue(uri.contains("issuer=WatchDesk"));
        assertTrue(uri.contains("digits=6"));
        assertTrue(uri.contains("period=30"));
    }

    @Test
    void acceptsCodeOfCurrentTimeStep() {
        String code = referenceCode(RFC_SECRET, System.currentTimeMillis() / 1000L / 30L);
        assertTrue(totpService.verifyCode(RFC_SECRET, code));
    }

    @Test
    void toleratesTwoStepsOfClockDrift() {
        long step = System.currentTimeMillis() / 1000L / 30L;
        assertTrue(totpService.verifyCode(RFC_SECRET, referenceCode(RFC_SECRET, step - 2)));
        assertTrue(totpService.verifyCode(RFC_SECRET, referenceCode(RFC_SECRET, step + 2)));
    }

    @Test
    void rejectsOutdatedCode() {
        long step = System.currentTimeMillis() / 1000L / 30L;
        assertFalse(totpService.verifyCode(RFC_SECRET, referenceCode(RFC_SECRET, step - 5)));
    }

    @Test
    void rejectsMalformedInput() {
        assertFalse(totpService.verifyCode(RFC_SECRET, "12345"));
        assertFalse(totpService.verifyCode(RFC_SECRET, "abcdef"));
        assertFalse(totpService.verifyCode(RFC_SECRET, null));
        assertFalse(totpService.verifyCode(null, "123456"));
    }

    @Test
    void codesDifferBetweenSecrets() {
        String other = totpService.generateSecret();
        String code = referenceCode(RFC_SECRET, System.currentTimeMillis() / 1000L / 30L);
        assertFalse(totpService.verifyCode(other, code));
    }

    /** Implémentation de référence indépendante du service testé (RFC 4226 / 6238). */
    private static String referenceCode(String base32Secret, long counter) {
        try {
            byte[] key = base32Decode(base32Secret);
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(counter).array());
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            return String.format("%06d", binary % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] base32Decode(String encoded) {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        int buffer = 0, bitsLeft = 0;
        for (char c : encoded.toCharArray()) {
            buffer = (buffer << 5) | alphabet.indexOf(c);
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out.toByteArray();
    }
}
