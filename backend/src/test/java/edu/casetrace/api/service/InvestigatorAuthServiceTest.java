package edu.casetrace.api.service;

import edu.casetrace.api.dto.InvestigatorDto;
import edu.casetrace.api.dto.RegisterRequest;
import edu.casetrace.api.dto.UpdateInvestigatorProfileRequest;
import edu.casetrace.api.dto.ChangeInvestigatorPasswordRequest;
import edu.casetrace.api.exception.EmailConflictException;
import edu.casetrace.api.exception.InvalidPasswordChangeException;
import edu.casetrace.api.exception.InvalidRegistrationException;
import edu.casetrace.api.exception.RegistrationConflictException;
import edu.casetrace.api.repository.InvestigatorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class InvestigatorAuthServiceTest {
    @Mock private InvestigatorRepository investigatorRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private InvestigatorAuthService authService;

    @Test
    void registrationNormalizesIdentityAndStoresOnlyEncodedPassword() {
        RegisterRequest request = new RegisterRequest("  Ada Lovelace ", " Ada.Field ",
                " ADA@example.test ", "a-long-private-passphrase", "a-long-private-passphrase");
        when(passwordEncoder.encode(request.password())).thenReturn("$2a$12$encoded-password-hash-for-test-only");
        when(investigatorRepository.insert("ada.field", "ada@example.test",
                "$2a$12$encoded-password-hash-for-test-only", "Ada Lovelace")).thenReturn(17L);
        InvestigatorDto profile = new InvestigatorDto(17L, "ada.field", "ada@example.test", "Ada Lovelace", "ACTIVE",
                OffsetDateTime.parse("2026-09-30T12:00:00Z"), null);
        when(investigatorRepository.findProfile(17L)).thenReturn(Optional.of(profile));

        InvestigatorDto registered = authService.register(request);

        assertEquals(profile, registered);
        verify(passwordEncoder).encode(request.password());
        verify(investigatorRepository).insert("ada.field", "ada@example.test",
                "$2a$12$encoded-password-hash-for-test-only", "Ada Lovelace");
    }

    @Test
    void duplicateIdentityReturnsSafeConflict() {
        RegisterRequest request = new RegisterRequest("Ada Lovelace", "ada", "ada@example.test",
                "a-long-private-passphrase", "a-long-private-passphrase");
        when(passwordEncoder.encode(request.password())).thenReturn("$2a$12$encoded-password-hash-for-test-only");
        when(investigatorRepository.insert("ada", "ada@example.test",
                "$2a$12$encoded-password-hash-for-test-only", "Ada Lovelace"))
                .thenThrow(new DuplicateKeyException("database detail must not escape"));

        RegistrationConflictException conflict = assertThrows(RegistrationConflictException.class,
                () -> authService.register(request));

        assertEquals("That username or email is already registered.", conflict.getMessage());
    }

    @Test
    void registrationRejectsMismatchedConfirmationBeforeHashing() {
        RegisterRequest request = new RegisterRequest("Ada Lovelace", "ada", "ada@example.test",
                "a-long-private-passphrase", "a-different-private-passphrase");

        assertThrows(InvalidRegistrationException.class, () -> authService.register(request));
        verify(passwordEncoder, never()).encode(org.mockito.ArgumentMatchers.anyString());
        verify(investigatorRepository, never()).insert(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void profileUpdateNormalizesEmailAndReturnsPersistedIdentity() {
        InvestigatorDto updated = new InvestigatorDto(17L, "ada.field", "ada@example.test", "Ada Lovelace", "ACTIVE",
                OffsetDateTime.parse("2026-09-30T12:00:00Z"), null);
        when(investigatorRepository.findProfile(17L)).thenReturn(Optional.of(updated));

        InvestigatorDto result = authService.updateProfile(17L,
                new UpdateInvestigatorProfileRequest(" Ada Lovelace ", " ADA@example.test "));

        assertEquals(updated, result);
        verify(investigatorRepository).updateProfile(17L, "Ada Lovelace", "ada@example.test");
    }

    @Test
    void duplicateEmailReturnsSafeConflict() {
        org.mockito.Mockito.doThrow(new DuplicateKeyException("database detail"))
                .when(investigatorRepository).updateProfile(17L, "Ada", "taken@example.test");

        EmailConflictException conflict = assertThrows(EmailConflictException.class,
                () -> authService.updateProfile(17L,
                        new UpdateInvestigatorProfileRequest("Ada", "taken@example.test")));

        assertEquals("That email address is already registered.", conflict.getMessage());
    }

    @Test
    void passwordChangeVerifiesAndStoresOnlyBcryptEncodedValue() {
        String oldHash = "$2a$12$old-password-hash-for-test-only";
        when(investigatorRepository.findPasswordHash(17L)).thenReturn(Optional.of(oldHash));
        when(passwordEncoder.matches("old private password", oldHash)).thenReturn(true);
        when(passwordEncoder.matches("a-new-private-passphrase", oldHash)).thenReturn(false);
        when(passwordEncoder.encode("a-new-private-passphrase")).thenReturn("$2a$12$new-password-hash-for-test-only");

        authService.changePassword(17L, new ChangeInvestigatorPasswordRequest(
                "old private password", "a-new-private-passphrase", "a-new-private-passphrase"));

        verify(investigatorRepository).updatePasswordHash(17L, "$2a$12$new-password-hash-for-test-only");
    }

    @Test
    void passwordChangeRejectsMismatchedConfirmationWithoutTouchingPasswordHash() {
        assertThrows(InvalidPasswordChangeException.class, () -> authService.changePassword(17L,
                new ChangeInvestigatorPasswordRequest("old", "a-new-private-passphrase", "different-passphrase")));
        verify(investigatorRepository, never()).findPasswordHash(17L);
        verify(investigatorRepository, never()).updatePasswordHash(org.mockito.ArgumentMatchers.eq(17L),
                org.mockito.ArgumentMatchers.anyString());
    }
}
