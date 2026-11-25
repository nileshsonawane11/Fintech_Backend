package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerEntryResponse;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private TransactionService transactionService;

    private LedgerTransaction sampleTx;
    private LedgerEntry sampleEntry;

    @BeforeEach
    void setUp() {
        sampleTx = new LedgerTransaction();
        sampleTx.setId(UUID.randomUUID());
        sampleTx.setTransactionId("TXN-10001");
        sampleTx.setTransactionType(TransactionType.TRANSFER);
        sampleTx.setTransactionStatus(TransactionStatus.SUCCESS);
        sampleTx.setCorrelationId("corr-998877");
        sampleTx.setReferenceNumber("REF-001");
        sampleTx.setCurrency("INR");
        sampleTx.setTotalDebit(new BigDecimal("5000.00"));
        sampleTx.setTotalCredit(new BigDecimal("5000.00"));
        sampleTx.setValueDate(LocalDate.now());

        sampleEntry = new LedgerEntry(
                UUID.randomUUID(),
                "LE-001",
                sampleTx,
                "ACC-1001",
                EntryType.DEBIT,
                new BigDecimal("5000.00"),
                "INR",
                LocalDate.now(),
                "Fund transfer",
                "REF-001"
        );
    }

    @Test
    @DisplayName("getAccountEntries maps LedgerEntry and LedgerTransaction to LedgerEntryResponse DTO inside transaction")
    void getAccountEntries_shouldReturnMappedDtoPage() {
        when(entryRepository.findByAccountIdAndDates(eq("ACC-1001"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleEntry), PageRequest.of(0, 50), 1));

        CursorPagedResponse<LedgerEntryResponse> result =
                transactionService.getAccountEntries("ACC-1001", null, null, 50, null);

        assertNotNull(result);
        assertEquals(1, result.data().size());

        LedgerEntryResponse dto = result.data().get(0);
        assertEquals("LE-001", dto.entryId());
        assertEquals("ACC-1001", dto.accountId());
        assertEquals(EntryType.DEBIT, dto.entryType());
        assertEquals(new BigDecimal("5000.00"), dto.amount());
        assertEquals("TXN-10001", dto.transactionId());
        assertEquals("corr-998877", dto.correlationId());

        // Verify nested TransactionSummaryResponse
        assertNotNull(dto.transaction());
        assertEquals("TXN-10001", dto.transaction().transactionId());
        assertEquals("corr-998877", dto.transaction().correlationId());
        assertEquals(TransactionStatus.SUCCESS, dto.transaction().transactionStatus());

        verify(entryRepository).findByAccountIdAndDates(eq("ACC-1001"), isNull(), isNull(), eq(PageRequest.of(0, 50)));
    }

    @Test
    @DisplayName("getAccountEntries throws BAD_REQUEST when accountId is blank")
    void getAccountEntries_whenAccountIdBlank_shouldThrowBadRequest() {
        LedgerException ex = assertThrows(LedgerException.class, () ->
                transactionService.getAccountEntries("", null, null, 50, null));

        assertEquals("INVALID_ACCOUNT_ID", ex.getErrorCode());
        verify(entryRepository, never()).findByAccountIdAndDates(any(), any(), any(), any());
    }
}
