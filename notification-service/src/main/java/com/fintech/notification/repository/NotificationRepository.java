package com.fintech.notification.repository;

import com.fintech.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByCustomerIdAndReadFalse(String customerId, Pageable pageable);

    Page<Notification> findByCustomerId(String customerId, Pageable pageable);

    long countByCustomerIdAndReadFalse(String customerId);

    Optional<Notification> findByNotificationId(String notificationId);

    boolean existsByEventId(String eventId);

    @Query("""
            SELECT n FROM Notification n
            WHERE (:unreadOnly = false OR n.read = false)
              AND (
                   n.customerId = :subject
                   OR (n.targetRole IS NOT NULL AND n.targetRole IN :roles AND (n.customerId LIKE 'ROLE:%' OR n.customerId = :subject))
              )
            """)
    Page<Notification> findForRecipientOrRoles(
            @Param("subject") String subject,
            @Param("roles") Collection<String> roles,
            @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable);

    @Query("""
            SELECT COUNT(n) FROM Notification n
            WHERE n.read = false
              AND (
                   n.customerId = :subject
                   OR (n.targetRole IS NOT NULL AND n.targetRole IN :roles AND (n.customerId LIKE 'ROLE:%' OR n.customerId = :subject))
              )
            """)
    long countUnreadForRecipientOrRoles(
            @Param("subject") String subject,
            @Param("roles") Collection<String> roles);

    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.read = true, n.readAt = :readAt
            WHERE n.customerId = :subject AND n.read = false
            """)
    int markAllAsReadForCustomer(
            @Param("subject") String subject,
            @Param("readAt") Instant readAt);
}
