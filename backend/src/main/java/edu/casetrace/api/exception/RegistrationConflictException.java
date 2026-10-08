package edu.casetrace.api.exception;

public class RegistrationConflictException extends RuntimeException {
    public RegistrationConflictException() {
        super("That username or email is already registered.");
    }
}
