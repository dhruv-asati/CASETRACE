package edu.casetrace.api.controller;

import edu.casetrace.api.dto.InvestigatorDto;
import edu.casetrace.api.dto.LoginRequest;
import edu.casetrace.api.dto.RegisterRequest;
import edu.casetrace.api.dto.UpdateInvestigatorProfileRequest;
import edu.casetrace.api.dto.ChangeInvestigatorPasswordRequest;
import edu.casetrace.api.exception.InvalidCredentialsException;
import edu.casetrace.api.security.InvestigatorPrincipal;
import edu.casetrace.api.service.InvestigatorAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final InvestigatorAuthService authService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    public AuthController(InvestigatorAuthService authService, AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          SessionAuthenticationStrategy sessionAuthenticationStrategy,
                          CookieCsrfTokenRepository csrfTokenRepository) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrfToken(CsrfToken token) {
        return new CsrfTokenResponse(token.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<InvestigatorDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public InvestigatorDto login(@Valid @RequestBody LoginRequest request,
                                 HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        Authentication authenticated;
        try {
            authenticated = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.login().strip(), request.password()));
        } catch (AuthenticationException rejected) {
            throw new InvalidCredentialsException();
        }

        // Establish an anonymous session first so the fixation strategy can rotate its ID.
        servletRequest.getSession(true);
        sessionAuthenticationStrategy.onAuthentication(authenticated, servletRequest, servletResponse);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authenticated);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);

        InvestigatorPrincipal principal = (InvestigatorPrincipal) authenticated.getPrincipal();
        authService.markLogin(principal.getInvestigatorId());
        return authService.current(principal.getInvestigatorId());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response,
                                       Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        csrfTokenRepository.saveToken(null, request, response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public InvestigatorDto me(@AuthenticationPrincipal InvestigatorPrincipal principal) {
        return authService.current(principal.getInvestigatorId());
    }

    @PutMapping("/me")
    public InvestigatorDto updateProfile(@AuthenticationPrincipal InvestigatorPrincipal principal,
                                         @Valid @RequestBody UpdateInvestigatorProfileRequest request) {
        return authService.updateProfile(principal.getInvestigatorId(), request);
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal InvestigatorPrincipal principal,
                                               @Valid @RequestBody ChangeInvestigatorPasswordRequest request,
                                               HttpServletRequest servletRequest,
                                               HttpServletResponse servletResponse,
                                               Authentication authentication) {
        authService.changePassword(principal.getInvestigatorId(), request);
        new SecurityContextLogoutHandler().logout(servletRequest, servletResponse, authentication);
        csrfTokenRepository.saveToken(null, servletRequest, servletResponse);
        return ResponseEntity.noContent().build();
    }

    public record CsrfTokenResponse(String token) {}
}
