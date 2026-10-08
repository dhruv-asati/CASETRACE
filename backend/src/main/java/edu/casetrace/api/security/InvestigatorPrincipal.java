package edu.casetrace.api.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public final class InvestigatorPrincipal implements UserDetails {
    private final long investigatorId;
    private final String username;
    private final String passwordHash;
    private final String email;
    private final String fullName;
    private final boolean enabled;

    public InvestigatorPrincipal(long investigatorId, String username, String passwordHash,
                                 String email, String fullName, boolean enabled) {
        this.investigatorId = investigatorId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.email = email;
        this.fullName = fullName;
        this.enabled = enabled;
    }

    public long getInvestigatorId() { return investigatorId; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_INVESTIGATOR"));
    }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return username; }
    @Override public boolean isEnabled() { return enabled; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return enabled; }
    @Override public boolean isCredentialsNonExpired() { return true; }
}
