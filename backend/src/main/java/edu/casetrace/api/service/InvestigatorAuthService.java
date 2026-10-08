package edu.casetrace.api.service;

import edu.casetrace.api.dto.InvestigatorDashboardDto;
import edu.casetrace.api.dto.InvestigatorDto;
import edu.casetrace.api.dto.InvestigatorStatsDto;
import edu.casetrace.api.dto.RecentInvestigationDto;
import edu.casetrace.api.dto.RegisterRequest;
import edu.casetrace.api.dto.UpdateInvestigatorProfileRequest;
import edu.casetrace.api.dto.ChangeInvestigatorPasswordRequest;
import edu.casetrace.api.exception.EmailConflictException;
import edu.casetrace.api.exception.InvalidCredentialsException;
import edu.casetrace.api.exception.InvalidPasswordChangeException;
import edu.casetrace.api.exception.RegistrationConflictException;
import edu.casetrace.api.repository.InvestigatorRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class InvestigatorAuthService {
    private final InvestigatorRepository investigatorRepository;
    private final PasswordEncoder passwordEncoder;

    public InvestigatorAuthService(InvestigatorRepository investigatorRepository, PasswordEncoder passwordEncoder) {
        this.investigatorRepository = investigatorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public InvestigatorDto register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new edu.casetrace.api.exception.InvalidRegistrationException();
        }
        String username = request.username().strip().toLowerCase(Locale.ROOT);
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        String fullName = request.fullName().strip();
        try {
            long id = investigatorRepository.insert(username, email,
                    passwordEncoder.encode(request.password()), fullName);
            return investigatorRepository.findProfile(id).orElseThrow();
        } catch (DuplicateKeyException conflict) {
            throw new RegistrationConflictException();
        }
    }

    public InvestigatorDto current(long investigatorId) {
        return investigatorRepository.findProfile(investigatorId)
                .orElseThrow(() -> new IllegalStateException("The authenticated investigator is unavailable."));
    }

    @Transactional
    public InvestigatorDto updateProfile(long investigatorId, UpdateInvestigatorProfileRequest request) {
        String fullName = request.fullName().strip();
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        try {
            investigatorRepository.updateProfile(investigatorId, fullName, email);
        } catch (DuplicateKeyException conflict) {
            throw new EmailConflictException();
        }
        return current(investigatorId);
    }

    @Transactional
    public void changePassword(long investigatorId, ChangeInvestigatorPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmNewPassword())) {
            throw new InvalidPasswordChangeException("The new password confirmation does not match.");
        }
        String currentHash = investigatorRepository.findPasswordHash(investigatorId)
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.currentPassword(), currentHash)) {
            throw new InvalidCredentialsException();
        }
        if (passwordEncoder.matches(request.newPassword(), currentHash)) {
            throw new InvalidPasswordChangeException("Choose a new password that differs from the current password.");
        }
        investigatorRepository.updatePasswordHash(investigatorId, passwordEncoder.encode(request.newPassword()));
    }

    public void markLogin(long investigatorId) {
        investigatorRepository.updateLastLogin(investigatorId);
    }

    public InvestigatorDashboardDto dashboard(long investigatorId) {
        InvestigatorDto investigator = current(investigatorId);
        InvestigatorStatsDto statistics = investigatorRepository.getStatistics(investigatorId);
        List<RecentInvestigationDto> recent = investigatorRepository.findRecentInvestigations(investigatorId);
        return new InvestigatorDashboardDto(investigator, statistics, recent);
    }
}
