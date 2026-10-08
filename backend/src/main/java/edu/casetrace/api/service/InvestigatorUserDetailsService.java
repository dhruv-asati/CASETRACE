package edu.casetrace.api.service;

import edu.casetrace.api.repository.InvestigatorRepository;
import edu.casetrace.api.security.InvestigatorPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class InvestigatorUserDetailsService implements UserDetailsService {
    private final InvestigatorRepository investigatorRepository;

    public InvestigatorUserDetailsService(InvestigatorRepository investigatorRepository) {
        this.investigatorRepository = investigatorRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        InvestigatorPrincipal principal = investigatorRepository.findForAuthentication(login)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials."));
        return principal;
    }
}
