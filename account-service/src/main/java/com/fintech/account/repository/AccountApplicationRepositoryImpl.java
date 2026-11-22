package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public class AccountApplicationRepositoryImpl implements AccountApplicationRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Slice<AccountApplication> findOpsApplicationsWithCursor(
            ApplicationStatus status,
            String customerId,
            String productCode,
            Instant fromDate,
            Instant toDate,
            String cursor,
            Pageable pageable
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<AccountApplication> query = cb.createQuery(AccountApplication.class);
        Root<AccountApplication> root = query.from(AccountApplication.class);

        Specification<AccountApplication> spec = AccountApplicationSpecifications.withOpsFilters(
                status, customerId, productCode, fromDate, toDate, cursor
        );
        Predicate predicate = spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        query.orderBy(cb.desc(root.get("applicationNumber")));

        int pageSize = pageable.isPaged() ? pageable.getPageSize() : 20;
        int offset = pageable.isPaged() ? (int) pageable.getOffset() : 0;

        TypedQuery<AccountApplication> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult(offset);
        typedQuery.setMaxResults(pageSize + 1);

        List<AccountApplication> results = typedQuery.getResultList();

        boolean hasNext = results.size() > pageSize;
        List<AccountApplication> content = hasNext ? results.subList(0, pageSize) : results;

        return new SliceImpl<>(content, pageable, hasNext);
    }
}
