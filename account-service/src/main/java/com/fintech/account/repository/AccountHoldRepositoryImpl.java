package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
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
public class AccountHoldRepositoryImpl implements AccountHoldRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Slice<AccountHold> findOpsHoldsWithCursor(
            String accountId,
            HoldStatus status,
            String reasonCode,
            Instant fromDate,
            Instant toDate,
            String cursor,
            Pageable pageable
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<AccountHold> query = cb.createQuery(AccountHold.class);
        Root<AccountHold> root = query.from(AccountHold.class);

        Specification<AccountHold> spec = AccountHoldSpecifications.withOpsFilters(
                accountId, status, reasonCode, fromDate, toDate, cursor
        );
        Predicate predicate = spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        query.orderBy(cb.desc(root.get("holdId")));

        int pageSize = pageable.isPaged() ? pageable.getPageSize() : 20;
        int offset = pageable.isPaged() ? (int) pageable.getOffset() : 0;

        TypedQuery<AccountHold> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult(offset);
        typedQuery.setMaxResults(pageSize + 1);

        List<AccountHold> results = typedQuery.getResultList();

        boolean hasNext = results.size() > pageSize;
        List<AccountHold> content = hasNext ? results.subList(0, pageSize) : results;

        return new SliceImpl<>(content, pageable, hasNext);
    }
}
