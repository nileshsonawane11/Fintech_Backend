package com.fintech.ledger.repository.specification;

import com.fintech.ledger.entity.ReconciliationRun;
import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import jakarta.persistence.criteria.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationRunSpecificationsTest {

    @Mock
    private Root<ReconciliationRun> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder cb;

    @Mock
    private Path<Object> statusPath;

    @Mock
    private Path<Object> typePath;

    @Mock
    private Path<Instant> startedAtPath;

    @Mock
    private Predicate statusPredicate;

    @Mock
    private Predicate typePredicate;

    @Mock
    private Predicate fromDatePredicate;

    @Mock
    private Predicate toDatePredicate;

    @Mock
    private Predicate conjunctionPredicate;

    @Mock
    private Predicate andPredicate;

    @BeforeEach
    void setUp() {
        lenient().when(root.get("status")).thenReturn(statusPath);
        lenient().when(root.get("reconciliationType")).thenReturn(typePath);
        lenient().doReturn(startedAtPath).when(root).get("startedAt");
    }

    @Test
    @DisplayName("No filters: creates empty predicate list returning conjunction (no WHERE clause)")
    void withFilters_whenAllNull_shouldReturnConjunction() {
        when(cb.conjunction()).thenReturn(conjunctionPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(null, null, null, null);

        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(conjunctionPredicate, result);
        verify(cb).conjunction();
        verify(cb, never()).equal(any(), any());
        verify(cb, never()).greaterThanOrEqualTo(any(), any(Instant.class));
        verify(cb, never()).lessThanOrEqualTo(any(), any(Instant.class));
    }

    @Test
    @DisplayName("Single filter - status only: creates equal predicate on status")
    void withFilters_whenStatusOnly_shouldCreateStatusPredicate() {
        when(cb.equal(statusPath, ReconciliationStatus.COMPLETED)).thenReturn(statusPredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(ReconciliationStatus.COMPLETED, null, null, null);

        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb).equal(statusPath, ReconciliationStatus.COMPLETED);
        verify(cb, never()).equal(eq(typePath), any());
        verify(cb, never()).greaterThanOrEqualTo(any(), any(Instant.class));
        verify(cb, never()).lessThanOrEqualTo(any(), any(Instant.class));
    }

    @Test
    @DisplayName("Single filter - type only: creates equal predicate on reconciliationType")
    void withFilters_whenTypeOnly_shouldCreateTypePredicate() {
        when(cb.equal(typePath, ReconciliationType.LEDGER_BALANCE)).thenReturn(typePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(null, ReconciliationType.LEDGER_BALANCE, null, null);

        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb).equal(typePath, ReconciliationType.LEDGER_BALANCE);
        verify(cb, never()).equal(eq(statusPath), any());
    }

    @Test
    @DisplayName("Single filter - fromDate only: creates greaterThanOrEqualTo predicate on startedAt")
    void withFilters_whenFromDateOnly_shouldCreateFromDatePredicate() {
        Instant fromDate = Instant.parse("2026-11-01T00:00:00Z");
        when(cb.greaterThanOrEqualTo(startedAtPath, fromDate)).thenReturn(fromDatePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(null, null, fromDate, null);

        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb).greaterThanOrEqualTo(startedAtPath, fromDate);
        verify(cb, never()).lessThanOrEqualTo(any(), any(Instant.class));
    }

    @Test
    @DisplayName("Single filter - toDate only: creates lessThanOrEqualTo predicate on startedAt")
    void withFilters_whenToDateOnly_shouldCreateToDatePredicate() {
        Instant toDate = Instant.parse("2026-11-30T23:59:59Z");
        when(cb.lessThanOrEqualTo(startedAtPath, toDate)).thenReturn(toDatePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(null, null, null, toDate);

        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb).lessThanOrEqualTo(startedAtPath, toDate);
        verify(cb, never()).greaterThanOrEqualTo(any(), any(Instant.class));
    }

    @Test
    @DisplayName("Multiple filters together: creates all 4 predicates combined with AND")
    void withFilters_whenAllFiltersProvided_shouldCombineAllPredicates() {
        Instant fromDate = Instant.parse("2026-11-01T00:00:00Z");
        Instant toDate = Instant.parse("2026-11-30T23:59:59Z");

        when(cb.equal(statusPath, ReconciliationStatus.COMPLETED)).thenReturn(statusPredicate);
        when(cb.equal(typePath, ReconciliationType.LEDGER_BALANCE)).thenReturn(typePredicate);
        when(cb.greaterThanOrEqualTo(startedAtPath, fromDate)).thenReturn(fromDatePredicate);
        when(cb.lessThanOrEqualTo(startedAtPath, toDate)).thenReturn(toDatePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(ReconciliationStatus.COMPLETED, ReconciliationType.LEDGER_BALANCE, fromDate, toDate);

        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(andPredicate, result);
        verify(cb).equal(statusPath, ReconciliationStatus.COMPLETED);
        verify(cb).equal(typePath, ReconciliationType.LEDGER_BALANCE);
        verify(cb).greaterThanOrEqualTo(startedAtPath, fromDate);
        verify(cb).lessThanOrEqualTo(startedAtPath, toDate);
    }

    @Test
    @DisplayName("Null date parameters explicitly: omits date predicates cleanly without parameter type issues")
    void withFilters_whenDatesExplicitlyNull_shouldOmitDatePredicates() {
        when(cb.equal(statusPath, ReconciliationStatus.FAILED)).thenReturn(statusPredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        Specification<ReconciliationRun> spec =
                ReconciliationRunSpecifications.withFilters(ReconciliationStatus.FAILED, null, null, null);

        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb, never()).greaterThanOrEqualTo(any(), any(Instant.class));
        verify(cb, never()).lessThanOrEqualTo(any(), any(Instant.class));
    }
}
