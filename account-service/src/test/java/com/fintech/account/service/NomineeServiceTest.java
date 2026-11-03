package com.fintech.account.service;

import com.fintech.account.dto.request.NomineeRequest;
import com.fintech.account.dto.response.AccountNomineeResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountNominee;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.NomineeRelationship;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountNomineeRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.EncryptionUtil;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NomineeServiceTest {

    @Mock
    private AccountNomineeRepository nomineeRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private EncryptionUtil encryptionUtil;

    @Mock
    private OutboxEventService outboxEventService;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private NomineeService nomineeService;

    private Account testAccount;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(UUID.randomUUID());
        testAccount.setAccountId("ACC-1001");
        testAccount.setIdentitySubject("sub-123");
        testAccount.setAccountStatus(AccountStatus.ACTIVE);
    }

    @Test
    void addNominee_whenValid_shouldEncryptMobileAndSave() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(nomineeRepository.getTotalAllocationPercentage("ACC-1001")).thenReturn(0);
        when(encryptionUtil.encrypt("9812345678")).thenReturn("encryptedMobileBlob");
        when(nomineeRepository.save(any(AccountNominee.class))).thenAnswer(inv -> {
            AccountNominee n = inv.getArgument(0);
            if (n.getId() == null) {
                n.setId(UUID.randomUUID());
            }
            return n;
        });

        NomineeRequest request = new NomineeRequest(
                "Sunita Sharma", NomineeRelationship.SPOUSE, LocalDate.of(1997, 3, 21), "9812345678", 100);

        AccountNomineeResponse response = nomineeService.addNominee("sub-123", "ACC-1001", request, "sub-123");

        assertNotNull(response);
        assertEquals("Sunita Sharma", response.fullName());
        assertEquals(100, response.allocationPercentage());
        assertEquals("********78", response.mobileNumber());

        verify(nomineeRepository).save(argThat(n -> "encryptedMobileBlob".equals(n.getMobileNumberEncrypted())));
        verify(outboxEventService).enqueueEvent(any(), eq("AccountNominee"), eq("AccountNomineeAddedEvent"), any());
    }

    @Test
    void addNominee_whenAllocationExceeds100_shouldThrowUnprocessable() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(nomineeRepository.getTotalAllocationPercentage("ACC-1001")).thenReturn(60);

        NomineeRequest request = new NomineeRequest(
                "Sunita Sharma", NomineeRelationship.SPOUSE, LocalDate.of(1997, 3, 21), "9812345678", 50);

        AccountException ex = assertThrows(AccountException.class,
                () -> nomineeService.addNominee("sub-123", "ACC-1001", request, "sub-123"));

        assertEquals("ALLOCATION_EXCEEDED", ex.getCode());
    }

    @Test
    void addNominee_whenAccountClosed_shouldThrowUnprocessable() {
        testAccount.setAccountStatus(AccountStatus.CLOSED);
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        NomineeRequest request = new NomineeRequest(
                "Sunita Sharma", NomineeRelationship.SPOUSE, LocalDate.of(1997, 3, 21), "9812345678", 100);

        AccountException ex = assertThrows(AccountException.class,
                () -> nomineeService.addNominee("sub-123", "ACC-1001", request, "sub-123"));

        assertEquals("ACCOUNT_CLOSED", ex.getCode());
    }

    @Test
    void listNominees_whenOwner_shouldReturnNominees() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        AccountNominee nominee = new AccountNominee();
        nominee.setId(UUID.randomUUID());
        nominee.setAccountId("ACC-1001");
        nominee.setFullName("Sunita Sharma");
        nominee.setRelationship(NomineeRelationship.SPOUSE);
        nominee.setDateOfBirth(LocalDate.of(1997, 3, 21));
        nominee.setMobileNumberEncrypted("enc123");
        nominee.setAllocationPercentage(100);

        when(nomineeRepository.findByAccountId("ACC-1001")).thenReturn(List.of(nominee));
        when(encryptionUtil.decrypt("enc123")).thenReturn("9812345678");

        List<AccountNomineeResponse> nominees = nomineeService.listNominees("sub-123", "ACC-1001", false);

        assertNotNull(nominees);
        assertEquals(1, nominees.size());
        assertEquals("Sunita Sharma", nominees.get(0).fullName());
        assertEquals("********78", nominees.get(0).mobileNumber());
    }
}
