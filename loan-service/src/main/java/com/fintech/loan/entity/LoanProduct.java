package com.fintech.loan.entity;

import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "loan_products")
public class LoanProduct {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_code", nullable = false, unique = true, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "loan_type", nullable = false, length = 50)
    private String loanType;

    @Enumerated(EnumType.STRING)
    @Column(name = "loan_category", nullable = false, length = 50)
    private LoanCategory loanCategory;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "detailed_description", columnDefinition = "TEXT")
    private String detailedDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligible_loan_purposes", columnDefinition = "jsonb")
    private List<String> eligibleLoanPurposes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "employment_types", columnDefinition = "jsonb")
    private List<String> employmentTypes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "min_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal minimumLoanAmount;

    @Column(name = "max_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal maximumLoanAmount;

    @Column(name = "interest_rate_from", nullable = false, precision = 5, scale = 2)
    private BigDecimal minimumInterestRate;

    @Column(name = "maximum_interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal maximumInterestRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_type", nullable = false, length = 20)
    private InterestCalculationMethod interestCalculationMethod = InterestCalculationMethod.REDUCING_BALANCE;

    @Column(name = "min_tenure_months", nullable = false)
    private Integer minimumTenureMonths;

    @Column(name = "max_tenure_months", nullable = false)
    private Integer maximumTenureMonths;

    @Column(name = "maximum_ltv_percentage", precision = 5, scale = 2)
    private BigDecimal maximumLTVPercentage;

    @Column(name = "minimum_monthly_income", nullable = false, precision = 15, scale = 2)
    private BigDecimal minimumMonthlyIncome = BigDecimal.ZERO;

    @Column(name = "max_foir_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxFoirPercentage = new BigDecimal("55.00");

    @Column(name = "secured", nullable = false)
    private Boolean secured = false;

    @Column(name = "balance_transfer_allowed", nullable = false)
    private boolean balanceTransferAllowed = false;

    @Column(name = "top_up_allowed", nullable = false)
    private boolean topUpAllowed = false;

    @Column(name = "step_up_emi_allowed", nullable = false)
    private boolean stepUpEMIAllowed = false;

    @Column(name = "step_up_emi_duration_months")
    private Integer stepUpEMIDurationMonths = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_documents", columnDefinition = "jsonb")
    private List<String> requiredDocuments = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligibility_rules", columnDefinition = "jsonb")
    private Map<String, Object> eligibilityRules = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_offers", columnDefinition = "jsonb")
    private List<String> applicableOffers = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy = "SYSTEM";

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy = "SYSTEM";

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public LoanProduct() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        syncLegacyFields();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        syncLegacyFields();
    }

    public void syncLegacyFields() {
        if (loanCategory != null) {
            this.loanType = loanCategory.name();
        }
        this.active = (this.status == ProductStatus.ACTIVE) && !this.deleted;
    }

    // Legacy compatibility accessors
    public BigDecimal getMinAmount() { return minimumLoanAmount; }
    public BigDecimal getMaxAmount() { return maximumLoanAmount; }
    public Integer getMinTenureMonths() { return minimumTenureMonths; }
    public Integer getMaxTenureMonths() { return maximumTenureMonths; }
    public BigDecimal getInterestRateFrom() { return minimumInterestRate; }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public LoanCategory getLoanCategory() { return loanCategory; }
    public void setLoanCategory(LoanCategory loanCategory) {
        this.loanCategory = loanCategory;
        if (loanCategory != null) {
            this.loanType = loanCategory.name();
        }
    }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDetailedDescription() { return detailedDescription; }
    public void setDetailedDescription(String detailedDescription) { this.detailedDescription = detailedDescription; }

    public List<String> getEligibleLoanPurposes() { return eligibleLoanPurposes; }
    public void setEligibleLoanPurposes(List<String> eligibleLoanPurposes) {
        this.eligibleLoanPurposes = eligibleLoanPurposes != null ? new ArrayList<>(eligibleLoanPurposes) : new ArrayList<>();
    }

    public List<String> getEmploymentTypes() { return employmentTypes; }
    public void setEmploymentTypes(List<String> employmentTypes) {
        this.employmentTypes = employmentTypes != null ? new ArrayList<>(employmentTypes) : new ArrayList<>();
    }

    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) {
        this.status = status;
        syncLegacyFields();
    }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) {
        this.active = Boolean.TRUE.equals(active);
        if (Boolean.TRUE.equals(active) && !this.deleted) {
            this.status = ProductStatus.ACTIVE;
        } else if (this.status == ProductStatus.ACTIVE) {
            this.status = ProductStatus.INACTIVE;
        }
    }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
        syncLegacyFields();
    }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getMinimumLoanAmount() { return minimumLoanAmount; }
    public void setMinimumLoanAmount(BigDecimal minimumLoanAmount) { this.minimumLoanAmount = minimumLoanAmount; }

    public BigDecimal getMaximumLoanAmount() { return maximumLoanAmount; }
    public void setMaximumLoanAmount(BigDecimal maximumLoanAmount) { this.maximumLoanAmount = maximumLoanAmount; }

    public BigDecimal getMinimumInterestRate() { return minimumInterestRate; }
    public void setMinimumInterestRate(BigDecimal minimumInterestRate) { this.minimumInterestRate = minimumInterestRate; }

    public BigDecimal getMaximumInterestRate() { return maximumInterestRate; }
    public void setMaximumInterestRate(BigDecimal maximumInterestRate) { this.maximumInterestRate = maximumInterestRate; }

    public InterestCalculationMethod getInterestCalculationMethod() { return interestCalculationMethod; }
    public void setInterestCalculationMethod(InterestCalculationMethod interestCalculationMethod) {
        this.interestCalculationMethod = interestCalculationMethod;
    }

    public Integer getMinimumTenureMonths() { return minimumTenureMonths; }
    public void setMinimumTenureMonths(Integer minimumTenureMonths) { this.minimumTenureMonths = minimumTenureMonths; }

    public Integer getMaximumTenureMonths() { return maximumTenureMonths; }
    public void setMaximumTenureMonths(Integer maximumTenureMonths) { this.maximumTenureMonths = maximumTenureMonths; }

    public BigDecimal getMaximumLTVPercentage() { return maximumLTVPercentage; }
    public void setMaximumLTVPercentage(BigDecimal maximumLTVPercentage) { this.maximumLTVPercentage = maximumLTVPercentage; }

    public BigDecimal getMinimumMonthlyIncome() { return minimumMonthlyIncome; }
    public void setMinimumMonthlyIncome(BigDecimal minimumMonthlyIncome) { this.minimumMonthlyIncome = minimumMonthlyIncome; }

    public BigDecimal getMaxFoirPercentage() { return maxFoirPercentage; }
    public void setMaxFoirPercentage(BigDecimal maxFoirPercentage) { this.maxFoirPercentage = maxFoirPercentage; }

    public Boolean getSecured() { return secured; }
    public void setSecured(Boolean secured) { this.secured = secured; }

    public boolean isBalanceTransferAllowed() { return balanceTransferAllowed; }
    public void setBalanceTransferAllowed(boolean balanceTransferAllowed) { this.balanceTransferAllowed = balanceTransferAllowed; }

    public boolean isTopUpAllowed() { return topUpAllowed; }
    public void setTopUpAllowed(boolean topUpAllowed) { this.topUpAllowed = topUpAllowed; }

    public boolean isStepUpEMIAllowed() { return stepUpEMIAllowed; }
    public void setStepUpEMIAllowed(boolean stepUpEMIAllowed) { this.stepUpEMIAllowed = stepUpEMIAllowed; }

    public Integer getStepUpEMIDurationMonths() { return stepUpEMIDurationMonths; }
    public void setStepUpEMIDurationMonths(Integer stepUpEMIDurationMonths) { this.stepUpEMIDurationMonths = stepUpEMIDurationMonths; }

    public List<String> getRequiredDocuments() { return requiredDocuments; }
    public void setRequiredDocuments(List<String> requiredDocuments) {
        this.requiredDocuments = requiredDocuments != null ? new ArrayList<>(requiredDocuments) : new ArrayList<>();
    }

    public Map<String, Object> getEligibilityRules() { return eligibilityRules; }
    public void setEligibilityRules(Map<String, Object> eligibilityRules) {
        this.eligibilityRules = eligibilityRules != null ? new LinkedHashMap<>(eligibilityRules) : new LinkedHashMap<>();
    }

    public List<String> getApplicableOffers() { return applicableOffers; }
    public void setApplicableOffers(List<String> applicableOffers) {
        this.applicableOffers = applicableOffers != null ? new ArrayList<>(applicableOffers) : new ArrayList<>();
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
