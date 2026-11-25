package com.fintech.notification.repository;

import com.fintech.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByCustomerIdAndReadFalse(String customerId, Pageable pageable);

    Page<Notification> findByCustomerId(String customerId, Pageable pageable);
}
