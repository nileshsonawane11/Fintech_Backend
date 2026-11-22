package com.fintech.card.event.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.card.entity.CardOutboxEvent;
import com.fintech.card.repository.CardOutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardOutboxPublisherTaskTest {

    @Mock
    private CardOutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaEventProducer kafkaEventProducer;

    private ObjectMapper objectMapper;
    private CardOutboxPublisherTask publisherTask;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        publisherTask = new CardOutboxPublisherTask(outboxEventRepository, kafkaEventProducer, objectMapper);
        ReflectionTestUtils.setField(publisherTask, "applicationEventsTopic", "card.application-events.v1");
        ReflectionTestUtils.setField(publisherTask, "lifecycleEventsTopic", "card.events.v1");
    }

    @Test
    @DisplayName("Publishes pending outbox event and updates status to PUBLISHED")
    void testPublishPendingEvents_Success() {
        UUID eventId = UUID.randomUUID();
        CardOutboxEvent event = new CardOutboxEvent(
                eventId,
                "CARD-APP-1001",
                "CARD_APPLICATION",
                "CARD_APPLICATION_SUBMITTED",
                "{\"cardApplicationId\":\"CARD-APP-1001\"}"
        );

        when(outboxEventRepository.findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
                eq("PENDING"), eq(5), any(Pageable.class)))
                .thenReturn(List.of(event));

        when(kafkaEventProducer.send(eq("card.application-events.v1"), eq("CARD-APP-1001"), any()))
                .thenReturn(CompletableFuture.completedFuture(null));

        publisherTask.publishPendingEvents();

        assertEquals("PUBLISHED", event.getPublishingStatus());
        assertNotNull(event.getPublishedAt());
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Failed Kafka publishing increments retry count")
    void testPublishPendingEvents_Failure_IncrementsRetry() {
        UUID eventId = UUID.randomUUID();
        CardOutboxEvent event = new CardOutboxEvent(
                eventId,
                "CARD-APP-1001",
                "CARD_APPLICATION",
                "CARD_APPLICATION_SUBMITTED",
                "{\"cardApplicationId\":\"CARD-APP-1001\"}"
        );
        event.setRetryCount(1);

        when(outboxEventRepository.findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
                eq("PENDING"), eq(5), any(Pageable.class)))
                .thenReturn(List.of(event));

        CompletableFuture<Void> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new RuntimeException("Kafka connection error"));
        when(kafkaEventProducer.send(any(), any(), any())).thenReturn(failedFuture);

        publisherTask.publishPendingEvents();

        assertEquals("PENDING", event.getPublishingStatus());
        assertEquals(2, event.getRetryCount());
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Failed Kafka publishing marks event FAILED when reaching MAX_RETRIES")
    void testPublishPendingEvents_MaxRetriesReached_MarksFailed() {
        UUID eventId = UUID.randomUUID();
        CardOutboxEvent event = new CardOutboxEvent(
                eventId,
                "CARD-APP-1001",
                "CARD_APPLICATION",
                "CARD_APPLICATION_SUBMITTED",
                "{\"cardApplicationId\":\"CARD-APP-1001\"}"
        );
        event.setRetryCount(4); // Next failure reaches 5

        when(outboxEventRepository.findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
                eq("PENDING"), eq(5), any(Pageable.class)))
                .thenReturn(List.of(event));

        CompletableFuture<Void> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new RuntimeException("Broker down"));
        when(kafkaEventProducer.send(any(), any(), any())).thenReturn(failedFuture);

        publisherTask.publishPendingEvents();

        assertEquals("FAILED", event.getPublishingStatus());
        assertEquals(5, event.getRetryCount());
        verify(outboxEventRepository).save(event);
    }
}
