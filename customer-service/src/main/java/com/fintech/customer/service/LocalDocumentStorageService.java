package com.fintech.customer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class LocalDocumentStorageService {

    private final Path root;

    public LocalDocumentStorageService(
            @Value("${storage.local.root:./data/kyc-documents}")
            String rootDirectory) {

        this.root = Path.of(rootDirectory)
                .toAbsolutePath()
                .normalize();
    }

    public void store(String storageKey, byte[] content)
            throws IOException {

        Path target = resolve(storageKey);
        Files.createDirectories(target.getParent());

        // Write to a temporary file first to avoid partial uploads.
        Path temporary = target.resolveSibling(
                target.getFileName() + "." + UUID.randomUUID() + ".tmp"
        );

        try {
            Files.write(temporary, content);

            try {
                Files.move(
                        temporary,
                        target,
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING
                );
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(
                        temporary,
                        target,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    public boolean exists(String storageKey) throws IOException {
        return Files.isRegularFile(resolve(storageKey));
    }

    public long size(String storageKey) throws IOException {
        return Files.size(resolve(storageKey));
    }

    public Path getPath(String storageKey) {
        return resolve(storageKey);
    }

    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("Storage key is required");
        }

        Path candidate = root.resolve(storageKey).normalize();

        if (!candidate.startsWith(root) || candidate.equals(root)) {
            throw new IllegalArgumentException(
                    "Invalid document storage key"
            );
        }

        return candidate;
    }
}