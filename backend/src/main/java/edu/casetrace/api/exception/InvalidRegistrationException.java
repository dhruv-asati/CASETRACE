package edu.casetrace.api.exception;

public class InvalidRegistrationException extends RuntimeException {
    public InvalidRegistrationException() {
        super("Password confirmation does not match.");
    }
}
