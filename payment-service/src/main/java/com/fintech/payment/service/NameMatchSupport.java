package com.fintech.payment.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public final class NameMatchSupport {

    private NameMatchSupport() {}

    public static BigDecimal computeSimilarity(String expectedName, String registeredName) {
        if (expectedName == null || expectedName.isBlank() || registeredName == null || registeredName.isBlank()) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        String normA = normalize(expectedName);
        String normB = normalize(registeredName);
        if (normA.equals(normB)) {
            return BigDecimal.ONE.setScale(4, RoundingMode.HALF_UP);
        }

        Set<String> tokensA = Arrays.stream(normA.split("\\s+")).filter(s -> !s.isBlank()).collect(Collectors.toSet());
        Set<String> tokensB = Arrays.stream(normB.split("\\s+")).filter(s -> !s.isBlank()).collect(Collectors.toSet());
        if (tokensA.isEmpty() || tokensB.isEmpty()) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }

        long intersection = tokensA.stream().filter(tokensB::contains).count();
        long union = tokensA.size() + tokensB.size() - intersection;
        double jaccard = union == 0 ? 0.0 : (double) intersection / union;

        int maxLen = Math.max(normA.length(), normB.length());
        double editSim = maxLen == 0 ? 1.0 : 1.0 - ((double) levenshtein(normA, normB) / maxLen);

        double combined = Math.max(jaccard, (0.6 * jaccard) + (0.4 * editSim));
        return BigDecimal.valueOf(Math.min(1.0, Math.max(0.0, combined)))
                .setScale(4, RoundingMode.HALF_UP);
    }

    private static String normalize(String input) {
        return input.toUpperCase()
                .replaceAll("\\b(MR|MRS|MS|MISS|DR|SHRI|SMT)\\b", " ")
                .replaceAll("[^A-Z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static int levenshtein(String a, String b) {
        int[] dp = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            dp[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            int prev = dp[0];
            dp[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int temp = dp[j];
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[j] = prev;
                } else {
                    dp[j] = 1 + Math.min(prev, Math.min(dp[j], dp[j - 1]));
                }
                prev = temp;
            }
        }
        return dp[b.length()];
    }
}
