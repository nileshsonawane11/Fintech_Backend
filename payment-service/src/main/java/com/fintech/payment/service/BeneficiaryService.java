package com.fintech.payment.service;

import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.request.AddUpiBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
import com.fintech.payment.dto.response.BeneficiaryValidationResponse;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.entity.Beneficiary;
import com.fintech.payment.entity.BeneficiaryValidation;
import com.fintech.payment.entity.ProviderContact;
import com.fintech.payment.entity.ProviderFundAccount;
import com.fintech.payment.enums.BeneficiaryStatus;
import com.fintech.payment.enums.BeneficiaryType;
import com.fintech.payment.enums.ValidationStatus;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.repository.BeneficiaryRepository;
import com.fintech.payment.repository.BeneficiaryValidationRepository;
import com.fintech.payment.repository.ProviderContactRepository;
import com.fintech.payment.repository.ProviderFundAccountRepository;
import com.fintech.payment.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final BeneficiaryValidationRepository validationRepository;
    private final ProviderContactRepository contactRepository;
    private final ProviderFundAccountRepository fundAccountRepository;
    private final PaymentPiiEncryptionService piiEncryptionService;
    private final CustomerServiceClient customerServiceClient;
    private final PayoutProvider payoutProvider;
    private final RazorpayProperties razorpayProperties;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;
    private final BigDecimal nameMatchThreshold;
    private final boolean allowUnverifiedPayouts;

    public BeneficiaryService(BeneficiaryRepository beneficiaryRepository,
                              PaymentPiiEncryptionService piiEncryptionService) {
        this(beneficiaryRepository, null, null, null, piiEncryptionService,
                null, null, new RazorpayProperties(), null, null,
                new BigDecimal("0.65"), false);
    }

    @Autowired
    public BeneficiaryService(
            BeneficiaryRepository beneficiaryRepository,
            BeneficiaryValidationRepository validationRepository,
            ProviderContactRepository contactRepository,
            ProviderFundAccountRepository fundAccountRepository,
            PaymentPiiEncryptionService piiEncryptionService,
            CustomerServiceClient customerServiceClient,
            PayoutProvider payoutProvider,
            RazorpayProperties razorpayProperties,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService,
            @Value("${payment.validation.name-match-threshold:0.65}") BigDecimal nameMatchThreshold,
            @Value("${payment.validation.allow-unverified-payouts:false}") boolean allowUnverifiedPayouts) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.validationRepository = validationRepository;
        this.contactRepository = contactRepository;
        this.fundAccountRepository = fundAccountRepository;
        this.piiEncryptionService = piiEncryptionService;
        this.customerServiceClient = customerServiceClient;
        this.payoutProvider = payoutProvider;
        this.razorpayProperties = razorpayProperties;
        this.outboxService = outboxService;
        this.auditService = auditService;
        this.nameMatchThreshold = nameMatchThreshold;
        this.allowUnverifiedPayouts = allowUnverifiedPayouts;
    }

    @Transactional
    public BeneficiaryResponse addBeneficiary(String userId, AddBeneficiaryRequest request) {
        if (request.getConfirmAccountNumber() != null && !request.getConfirmAccountNumber().isBlank()
                && !request.getAccountNumber().equals(request.getConfirmAccountNumber())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ACCOUNT_NUMBER_MISMATCH",
                    "Account number and confirm account number do not match");
        }

        CustomerProfileDto customer = customerServiceClient.verifyKycApproved(userId);
        String normalizedIfsc = request.getIfscCode().trim().toUpperCase();
        String acctHash = piiEncryptionService.fingerprint(request.getAccountNumber() + ":" + normalizedIfsc);

        if (beneficiaryRepository.existsByUserIdAndAccountNumberHashAndIfscCodeAndStatusNot(
                userId, acctHash, normalizedIfsc, BeneficiaryStatus.INACTIVE.name())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_BENEFICIARY",
                    "An active or pending beneficiary with this account number and IFSC already exists");
        }

        String beneficiaryId = "BEN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId(beneficiaryId);
        beneficiary.setUserId(userId);
        beneficiary.setCustomerId(customer.customerId());
        beneficiary.setBeneficiaryType(BeneficiaryType.BANK_ACCOUNT.name());
        beneficiary.setNickname(request.getNickname().trim());
        beneficiary.setBeneficiaryName(request.getBeneficiaryName().trim());
        beneficiary.setAccountNumber(piiEncryptionService.encrypt(request.getAccountNumber()));
        beneficiary.setAccountNumberHash(acctHash);
        beneficiary.setIfscCode(normalizedIfsc);
        beneficiary.setBankName(request.getBankName().trim());
        beneficiary.setAccountType(request.getAccountType());
        beneficiary.setRelationship(request.getRelationship());
        beneficiary.setDescription(request.getDescription());
        beneficiary.setStatus(BeneficiaryStatus.PENDING_VALIDATION.name());
        beneficiary.setVerificationStatus(ValidationStatus.INITIATED.name());

        beneficiaryRepository.save(beneficiary);

        String masked = SecurityUtils.maskAccountNumber(request.getAccountNumber());
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                beneficiaryId,
                "Beneficiary",
                PaymentConstants.EVT_BENEFICIARY_CREATED,
                customer.customerId(),
                null,
                new BeneficiaryCreatedPayload(beneficiaryId, BeneficiaryType.BANK_ACCOUNT.name(), masked, Instant.now())
        );
        auditService.record(userId, "CUSTOMER", "BENEFICIARY_ADDED", "Beneficiary", beneficiaryId,
                "Bank beneficiary added: " + masked + " IFSC=" + normalizedIfsc);

        return toResponse(beneficiary, masked, null);
    }

    @Transactional
    public BeneficiaryResponse addUpiBeneficiary(String userId, AddUpiBeneficiaryRequest request) {
        CustomerProfileDto customer = customerServiceClient.verifyKycApproved(userId);
        String normalizedVpa = request.vpa().trim().toLowerCase();
        String vpaHash = piiEncryptionService.fingerprint(normalizedVpa);

        if (beneficiaryRepository.existsByUserIdAndVpaHashAndStatusNot(
                userId, vpaHash, BeneficiaryStatus.INACTIVE.name())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_BENEFICIARY",
                    "An active or pending beneficiary with this UPI ID already exists");
        }

        String beneficiaryId = "BEN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String maskedVpa = SecurityUtils.maskVpa(normalizedVpa);

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId(beneficiaryId);
        beneficiary.setUserId(userId);
        beneficiary.setCustomerId(customer.customerId());
        beneficiary.setBeneficiaryType(BeneficiaryType.UPI.name());
        beneficiary.setNickname(request.nickname().trim());
        beneficiary.setBeneficiaryName(request.beneficiaryName().trim());
        beneficiary.setVpaEncrypted(piiEncryptionService.encrypt(normalizedVpa));
        beneficiary.setVpaMasked(maskedVpa);
        beneficiary.setVpaHash(vpaHash);
        beneficiary.setRelationship(request.relationship());
        beneficiary.setDescription(request.description());
        beneficiary.setStatus(BeneficiaryStatus.PENDING_VALIDATION.name());
        beneficiary.setVerificationStatus(ValidationStatus.INITIATED.name());

        beneficiaryRepository.save(beneficiary);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                beneficiaryId,
                "Beneficiary",
                PaymentConstants.EVT_BENEFICIARY_CREATED,
                customer.customerId(),
                null,
                new BeneficiaryCreatedPayload(beneficiaryId, BeneficiaryType.UPI.name(), maskedVpa, Instant.now())
        );
        auditService.record(userId, "CUSTOMER", "BENEFICIARY_UPI_ADDED", "Beneficiary", beneficiaryId,
                "UPI beneficiary added: " + maskedVpa);

        return toResponse(beneficiary, null, maskedVpa);
    }

    @Transactional(readOnly = true)
    public PagedResponse<BeneficiaryResponse> listBeneficiaries(String userId, int page, int size) {
        int clampedSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<Beneficiary> result = beneficiaryRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(page, 0), clampedSize));
        return new PagedResponse<>(
                result.getContent().stream().map(this::toSafeResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public BeneficiaryResponse getBeneficiary(String userId, String beneficiaryId) {
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BENEFICIARY_NOT_FOUND",
                        "Beneficiary not found: " + beneficiaryId));
        return toSafeResponse(beneficiary);
    }

    @Transactional
    public BeneficiaryValidationResponse validateBeneficiary(String userId, String beneficiaryId) {
        CustomerProfileDto customer = customerServiceClient.verifyKycApproved(userId);
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BENEFICIARY_NOT_FOUND",
                        "Beneficiary not found: " + beneficiaryId));

        if (BeneficiaryStatus.INACTIVE.name().equals(beneficiary.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "BENEFICIARY_INACTIVE",
                    "Cannot validate an inactive beneficiary");
        }
        if (BeneficiaryStatus.VERIFIED.name().equals(beneficiary.getStatus())
                || BeneficiaryStatus.ACTIVE.name().equals(beneficiary.getStatus())) {
            BeneficiaryValidation existing = validationRepository.findTopByBeneficiaryIdOrderByCreatedAtDesc(beneficiaryId)
                    .orElse(null);
            if (existing != null) {
                return toValidationResponse(existing);
            }
        }

        if (!payoutProvider.isValidationAvailable()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "VALIDATION_PROVIDER_UNAVAILABLE",
                    "RazorpayX Fund Account Validation is not configured or enabled");
        }

        String contactId = ensureProviderContact(userId, customer, beneficiary);
        String fundAccountId = ensureProviderFundAccount(beneficiary, contactId);

        boolean isUpi = BeneficiaryType.UPI.name().equalsIgnoreCase(beneficiary.getBeneficiaryType());
        long validationAmountPaise = (!isUpi && !razorpayProperties.getRazorpayx().getValidation().isPennilessEnabled())
                ? razorpayProperties.getRazorpayx().getValidation().getPennyDropAmountPaise()
                : 0L;
        String validationMode = isUpi ? "VPA_VALIDATION"
                : (validationAmountPaise > 0 ? "PENNY_DROP" : "PENNILESS");

        String validationId = "VAL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        ValidationResult providerResult = payoutProvider.validateFundAccount(new ValidateFundAccountCommand(
                fundAccountId,
                validationMode,
                validationAmountPaise,
                PaymentConstants.DEFAULT_CURRENCY,
                validationId,
                Map.of("beneficiary_id", beneficiaryId, "finbank_user", userId)
        ));

        BeneficiaryValidation validation = new BeneficiaryValidation();
        validation.setValidationId(validationId);
        validation.setBeneficiaryId(beneficiaryId);
        validation.setUserId(userId);
        validation.setProviderName(payoutProvider.providerName());
        validation.setProviderContactId(contactId);
        validation.setProviderFundAccountId(fundAccountId);
        validation.setProviderValidationId(providerResult.providerValidationId());
        validation.setValidationMode(validationMode);
        validation.setAmount(validationAmountPaise > 0
                ? BigDecimal.valueOf(validationAmountPaise).divide(new BigDecimal("100"))
                : BigDecimal.ZERO);
        validation.setCurrency(PaymentConstants.DEFAULT_CURRENCY);
        validation.setStatus(ValidationStatus.VALIDATING.name());
        validationRepository.save(validation);

        beneficiary.setStatus(BeneficiaryStatus.VALIDATING.name());
        beneficiary.setVerificationStatus(ValidationStatus.VALIDATING.name());
        beneficiary.setProviderContactId(contactId);
        beneficiary.setProviderFundAccountId(fundAccountId);
        beneficiary.setValidationProviderRef(providerResult.providerValidationId());
        beneficiaryRepository.save(beneficiary);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                beneficiaryId,
                "Beneficiary",
                PaymentConstants.EVT_BENEFICIARY_VALIDATION_INITIATED,
                customer.customerId(),
                providerResult.providerValidationId(),
                new BeneficiaryValidationInitiatedPayload(
                        beneficiaryId, validationId, providerResult.providerValidationId(), validationMode, Instant.now())
        );

        if ("completed".equalsIgnoreCase(providerResult.status()) || "failed".equalsIgnoreCase(providerResult.status())) {
            applyValidationOutcome(validation, beneficiary, providerResult);
        }

        auditService.record(userId, "CUSTOMER", "BENEFICIARY_VALIDATION_INITIATED", "Beneficiary", beneficiaryId,
                "Validation initiated: " + validationId + " providerRef=" + providerResult.providerValidationId());

        return toValidationResponse(validation);
    }

    @Transactional
    public BeneficiaryValidationResponse getValidationStatus(String userId, String beneficiaryId) {
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BENEFICIARY_NOT_FOUND",
                        "Beneficiary not found: " + beneficiaryId));

        BeneficiaryValidation validation = validationRepository.findTopByBeneficiaryIdOrderByCreatedAtDesc(beneficiaryId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "VALIDATION_NOT_FOUND",
                        "No validation attempt found for beneficiary: " + beneficiaryId));

        if (ValidationStatus.VALIDATING.name().equals(validation.getStatus())
                && validation.getProviderValidationId() != null
                && payoutProvider != null && payoutProvider.isValidationAvailable()) {
            ValidationResult refreshed = payoutProvider.fetchValidation(validation.getProviderValidationId());
            if ("completed".equalsIgnoreCase(refreshed.status()) || "failed".equalsIgnoreCase(refreshed.status())) {
                applyValidationOutcome(validation, beneficiary, refreshed);
            }
        }
        return toValidationResponse(validation);
    }

    @Transactional
    public void processValidationWebhook(ValidationResult providerResult) {
        if (providerResult == null || providerResult.providerValidationId() == null) {
            return;
        }
        BeneficiaryValidation validation = validationRepository
                .findByProviderValidationId(providerResult.providerValidationId())
                .orElse(null);
        if (validation == null) {
            return;
        }
        if (ValidationStatus.VERIFIED.name().equals(validation.getStatus())
                || ValidationStatus.FAILED.name().equals(validation.getStatus())
                || ValidationStatus.REJECTED.name().equals(validation.getStatus())) {
            return;
        }
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryId(validation.getBeneficiaryId())
                .orElse(null);
        if (beneficiary != null) {
            applyValidationOutcome(validation, beneficiary, providerResult);
        }
    }

    @Transactional
    public BeneficiaryResponse deactivateBeneficiary(String userId, String beneficiaryId) {
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BENEFICIARY_NOT_FOUND",
                        "Beneficiary not found: " + beneficiaryId));

        if (!BeneficiaryStatus.INACTIVE.name().equals(beneficiary.getStatus())) {
            beneficiary.setStatus(BeneficiaryStatus.INACTIVE.name());
            beneficiary.setDeactivatedAt(Instant.now());
            beneficiaryRepository.save(beneficiary);

            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                    beneficiaryId,
                    "Beneficiary",
                    PaymentConstants.EVT_BENEFICIARY_DEACTIVATED,
                    beneficiary.getCustomerId(),
                    beneficiary.getProviderFundAccountId(),
                    new BeneficiaryDeactivatedPayload(beneficiaryId, beneficiary.getDeactivatedAt())
            );
            auditService.record(userId, "CUSTOMER", "BENEFICIARY_DEACTIVATED", "Beneficiary", beneficiaryId,
                    "Beneficiary deactivated by owner");
        }
        return toSafeResponse(beneficiary);
    }

    @Transactional
    public String ensureFundAccountForTransfer(Beneficiary beneficiary, CustomerProfileDto customer) {
        if (beneficiary.getProviderFundAccountId() != null && !beneficiary.getProviderFundAccountId().isBlank()) {
            return beneficiary.getProviderFundAccountId();
        }
        String contactId = ensureProviderContact(beneficiary.getUserId(), customer, beneficiary);
        String fundAccountId = ensureProviderFundAccount(beneficiary, contactId);
        beneficiary.setProviderContactId(contactId);
        beneficiary.setProviderFundAccountId(fundAccountId);
        beneficiaryRepository.save(beneficiary);
        return fundAccountId;
    }

    public Beneficiary findEligibleBeneficiaryForTransfer(String userId, String beneficiaryId) {
        Beneficiary beneficiary = beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BENEFICIARY_NOT_FOUND",
                        "Beneficiary not found: " + beneficiaryId));

        if (BeneficiaryStatus.INACTIVE.name().equals(beneficiary.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BENEFICIARY_INACTIVE",
                    "Beneficiary is inactive and cannot receive payouts");
        }

        boolean verified = BeneficiaryStatus.VERIFIED.name().equals(beneficiary.getStatus())
                || BeneficiaryStatus.ACTIVE.name().equals(beneficiary.getStatus());

        if (!verified && !allowUnverifiedPayouts) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BENEFICIARY_NOT_VERIFIED",
                    "Beneficiary must pass account/VPA validation before payouts. Current status: " + beneficiary.getStatus());
        }
        return beneficiary;
    }

    @Transactional
    public boolean encryptLegacyAccountNumbers(int pageNumber) {
        Page<Beneficiary> page = beneficiaryRepository.findAll(
                PageRequest.of(pageNumber, 200, Sort.by(Sort.Direction.ASC, "id")));
        boolean hasPlaintext = page.getContent().stream()
                .anyMatch(b -> b.getAccountNumber() != null && !piiEncryptionService.isEncrypted(b.getAccountNumber()));
        if (hasPlaintext && !piiEncryptionService.isConfigured()) {
            throw new IllegalStateException(
                    "PAYMENT_PII_ENCRYPTION_KEY is required to encrypt existing beneficiary account numbers");
        }
        page.getContent().stream()
                .filter(b -> b.getAccountNumber() != null && !piiEncryptionService.isEncrypted(b.getAccountNumber()))
                .forEach(b -> {
                    String plain = b.getAccountNumber();
                    b.setAccountNumber(piiEncryptionService.encrypt(plain));
                    if (b.getAccountNumberHash() == null && b.getIfscCode() != null) {
                        b.setAccountNumberHash(piiEncryptionService.fingerprint(plain + ":" + b.getIfscCode().toUpperCase()));
                    }
                });
        beneficiaryRepository.saveAll(page.getContent());
        return page.hasNext();
    }

    private void applyValidationOutcome(
            BeneficiaryValidation validation, Beneficiary beneficiary, ValidationResult result) {
        Instant now = Instant.now();
        validation.setProviderAccountStatus(result.providerAccountStatus());
        validation.setRegisteredName(result.registeredName());
        validation.setUtr(result.utr());
        validation.setCompletedAt(now);

        boolean accountActive = "active".equalsIgnoreCase(result.providerAccountStatus())
                || "valid".equalsIgnoreCase(result.providerAccountStatus());

        if ("completed".equalsIgnoreCase(result.status()) && accountActive) {
            BigDecimal score = NameMatchSupport.computeSimilarity(
                    beneficiary.getBeneficiaryName(), result.registeredName());
            validation.setNameMatchScore(score);
            beneficiary.setValidatedAccountName(result.registeredName());
            beneficiary.setNameMatchScore(score);

            if (score.compareTo(nameMatchThreshold) >= 0) {
                validation.setStatus(ValidationStatus.VERIFIED.name());
                beneficiary.setStatus(BeneficiaryStatus.VERIFIED.name());
                beneficiary.setVerificationStatus(ValidationStatus.VERIFIED.name());
                beneficiary.setValidationReason("Account active and beneficiary name matched");
                beneficiary.setVerifiedAt(now);

                outboxService.enqueueEvent(
                        PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                        beneficiary.getBeneficiaryId(),
                        "Beneficiary",
                        PaymentConstants.EVT_BENEFICIARY_VERIFIED,
                        beneficiary.getCustomerId(),
                        validation.getProviderValidationId(),
                        new BeneficiaryVerifiedPayload(
                                beneficiary.getBeneficiaryId(), validation.getValidationId(), score, now)
                );
            } else {
                validation.setStatus(ValidationStatus.REJECTED.name());
                validation.setFailureReason("NAME_MISMATCH");
                validation.setFailureDescription("Registered account name does not match beneficiary name");
                beneficiary.setStatus(BeneficiaryStatus.REJECTED.name());
                beneficiary.setVerificationStatus(ValidationStatus.REJECTED.name());
                beneficiary.setValidationReason("Beneficiary name mismatch (score=" + score + ")");

                outboxService.enqueueEvent(
                        PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                        beneficiary.getBeneficiaryId(),
                        "Beneficiary",
                        PaymentConstants.EVT_BENEFICIARY_VALIDATION_FAILED,
                        beneficiary.getCustomerId(),
                        validation.getProviderValidationId(),
                        new BeneficiaryValidationFailedPayload(
                                beneficiary.getBeneficiaryId(), validation.getValidationId(), "NAME_MISMATCH", now)
                );
            }
        } else {
            String reason = result.failureReason() != null ? result.failureReason() : "ACCOUNT_INVALID_OR_FAILED";
            String desc = result.failureDescription() != null
                    ? result.failureDescription()
                    : "Provider reported account status: " + result.providerAccountStatus();
            validation.setStatus(ValidationStatus.FAILED.name());
            validation.setFailureSource(result.failureSource());
            validation.setFailureReason(reason);
            validation.setFailureDescription(desc);

            beneficiary.setStatus(BeneficiaryStatus.FAILED.name());
            beneficiary.setVerificationStatus(ValidationStatus.FAILED.name());
            beneficiary.setValidationReason(desc);

            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_BENEFICIARY_EVENTS,
                    beneficiary.getBeneficiaryId(),
                    "Beneficiary",
                    PaymentConstants.EVT_BENEFICIARY_VALIDATION_FAILED,
                    beneficiary.getCustomerId(),
                    validation.getProviderValidationId(),
                    new BeneficiaryValidationFailedPayload(
                            beneficiary.getBeneficiaryId(), validation.getValidationId(), reason, now)
            );
        }
        validationRepository.save(validation);
        beneficiaryRepository.save(beneficiary);
    }

    private String ensureProviderContact(String userId, CustomerProfileDto customer, Beneficiary beneficiary) {
        return contactRepository.findByProviderNameAndOwnerTypeAndOwnerRef(
                        payoutProvider.providerName(), "BENEFICIARY", beneficiary.getBeneficiaryId())
                .map(ProviderContact::getProviderContactId)
                .orElseGet(() -> {
                    ContactResult created = payoutProvider.createContact(new CreateContactCommand(
                            beneficiary.getBeneficiaryName(),
                            customer.email(),
                            customer.mobileNumber(),
                            "customer",
                            beneficiary.getBeneficiaryId(),
                            Map.of("user_id", userId, "beneficiary_id", beneficiary.getBeneficiaryId())
                    ));
                    ProviderContact entity = new ProviderContact();
                    entity.setProviderName(payoutProvider.providerName());
                    entity.setOwnerType("BENEFICIARY");
                    entity.setOwnerRef(beneficiary.getBeneficiaryId());
                    entity.setProviderContactId(created.providerContactId());
                    entity.setContactType(created.type());
                    entity.setName(created.name());
                    entity.setEmail(customer.email());
                    entity.setPhoneMasked(SecurityUtils.maskAccountNumber(customer.mobileNumber()));
                    contactRepository.save(entity);
                    return created.providerContactId();
                });
    }

    private String ensureProviderFundAccount(Beneficiary beneficiary, String contactId) {
        return fundAccountRepository.findByProviderNameAndBeneficiaryId(
                        payoutProvider.providerName(), beneficiary.getBeneficiaryId())
                .map(ProviderFundAccount::getProviderFundAccountId)
                .orElseGet(() -> {
                    FundAccountResult created;
                    if (BeneficiaryType.UPI.name().equalsIgnoreCase(beneficiary.getBeneficiaryType())) {
                        String plainVpa = piiEncryptionService.decrypt(beneficiary.getVpaEncrypted());
                        created = payoutProvider.createVpaFundAccount(
                                new CreateVpaFundAccountCommand(contactId, plainVpa));
                    } else {
                        String plainAcct = piiEncryptionService.decrypt(beneficiary.getAccountNumber());
                        created = payoutProvider.createBankFundAccount(new CreateBankFundAccountCommand(
                                contactId,
                                beneficiary.getBeneficiaryName(),
                                beneficiary.getIfscCode(),
                                plainAcct
                        ));
                    }
                    ProviderFundAccount entity = new ProviderFundAccount();
                    entity.setProviderName(payoutProvider.providerName());
                    entity.setBeneficiaryId(beneficiary.getBeneficiaryId());
                    entity.setProviderContactId(contactId);
                    entity.setProviderFundAccountId(created.providerFundAccountId());
                    entity.setAccountType(created.accountType());
                    entity.setActive(created.active());
                    fundAccountRepository.save(entity);
                    return created.providerFundAccountId();
                });
    }

    private BeneficiaryResponse toSafeResponse(Beneficiary b) {
        String maskedAcct = null;
        if (b.getAccountNumber() != null && piiEncryptionService.isConfigured()
                && piiEncryptionService.isEncrypted(b.getAccountNumber())) {
            maskedAcct = SecurityUtils.maskAccountNumber(piiEncryptionService.decrypt(b.getAccountNumber()));
        } else if (b.getAccountNumber() != null && !piiEncryptionService.isEncrypted(b.getAccountNumber())) {
            maskedAcct = SecurityUtils.maskAccountNumber(b.getAccountNumber());
        }
        return toResponse(b, maskedAcct, b.getVpaMasked());
    }

    private BeneficiaryResponse toResponse(Beneficiary b, String maskedAcct, String maskedVpa) {
        BeneficiaryResponse response = new BeneficiaryResponse();
        response.setBeneficiaryId(b.getBeneficiaryId());
        response.setBeneficiaryType(b.getBeneficiaryType());
        response.setNickname(b.getNickname());
        response.setBeneficiaryName(b.getBeneficiaryName());
        response.setStatus(b.getStatus());
        response.setMaskedAccountNumber(maskedAcct);
        response.setMaskedVpa(maskedVpa);
        response.setIfscCode(b.getIfscCode());
        response.setBankName(b.getBankName());
        response.setVerificationStatus(b.getVerificationStatus());
        response.setValidatedAccountName(b.getValidatedAccountName());
        response.setNameMatchScore(b.getNameMatchScore());
        response.setCreatedAt(b.getCreatedAt());
        return response;
    }

    private BeneficiaryValidationResponse toValidationResponse(BeneficiaryValidation v) {
        return new BeneficiaryValidationResponse(
                v.getValidationId(),
                v.getBeneficiaryId(),
                v.getValidationMode(),
                v.getStatus(),
                v.getProviderAccountStatus(),
                v.getRegisteredName(),
                v.getNameMatchScore(),
                v.getUtr(),
                v.getFailureReason(),
                v.getFailureDescription(),
                v.getInitiatedAt(),
                v.getCompletedAt()
        );
    }
}
