package com.fintech.identity.repository;

import com.fintech.identity.model.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select r from RefreshToken r
        where r.tokenHash = :hash
        """)
    Optional<RefreshToken> findByTokenHashForUpdate(
            @Param("hash") String hash
    );

    List<RefreshToken> findAllByFamilyId(UUID familyId);
}