package edu.casetrace.api.exception;

public class EmailConflictException extends RuntimeException {
    public EmailConflictException() {
        super("That email address is already registered.");
    }
}
