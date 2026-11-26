package com.fintech.loan.config;

import com.fintech.loan.constants.LoanConstants;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Component
public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String tokenUse = jwt.getClaimAsString(LoanConstants.CLAIM_TOKEN_USE);
        if (!LoanConstants.TOKEN_USE_ACCESS.equals(tokenUse)) {
            throw new InvalidBearerTokenException("An ACCESS token is required.");
        }

        Collection<GrantedAuthority> authorities = new ArrayList<>();

        List<String> roles = jwt.getClaimAsStringList(LoanConstants.CLAIM_ROLES);
        if (roles != null) {
            for (String role : roles) {
                if (role != null && !role.isBlank()) {
                    String normalized = role.trim().toUpperCase();
                    String formattedRole = normalized.startsWith(LoanConstants.ROLE_PREFIX)
                            ? normalized
                            : LoanConstants.ROLE_PREFIX + normalized;
                    authorities.add(new SimpleGrantedAuthority(formattedRole));
                }
            }
        }

        List<String> permissions = jwt.getClaimAsStringList(LoanConstants.CLAIM_PERMISSIONS);
        if (permissions != null) {
            for (String perm : permissions) {
                if (perm != null && !perm.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(perm.trim()));
                }
            }
        }

        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
