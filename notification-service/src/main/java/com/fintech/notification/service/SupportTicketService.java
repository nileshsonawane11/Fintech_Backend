package com.fintech.notification.service;

import com.fintech.notification.dto.request.CreateSupportTicketRequest;
import com.fintech.notification.dto.response.SupportTicketResponse;
import com.fintech.notification.entity.SupportTicket;
import com.fintech.notification.repository.SupportTicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
public class SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;

    public SupportTicketService(SupportTicketRepository supportTicketRepository) {
        this.supportTicketRepository = supportTicketRepository;
    }

    public SupportTicketResponse createTicket(String customerId, CreateSupportTicketRequest request) {
        String ticketId = generateTicketId();

        SupportTicket ticket = new SupportTicket();
        ticket.setId(UUID.randomUUID().toString());
        ticket.setTicketId(ticketId);
        ticket.setCustomerId(customerId);
        ticket.setCategory(request.getCategory());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setRelatedPaymentId(request.getRelatedPaymentId());
        ticket.setStatus("OPEN");
        ticket.setCreatedAt(Instant.now());

        supportTicketRepository.save(ticket);

        return new SupportTicketResponse(ticketId, "OPEN", request.getCategory(), ticket.getCreatedAt());
    }

    private String generateTicketId() {
        int number = ThreadLocalRandom.current().nextInt(100000, 999999);
        return "TCK-" + number;
    }
}
