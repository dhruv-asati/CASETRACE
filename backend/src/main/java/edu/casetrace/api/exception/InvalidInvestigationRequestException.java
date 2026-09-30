package edu.casetrace.api.exception;

public class InvalidInvestigationRequestException extends RuntimeException {
    public InvalidInvestigationRequestException(String message) {
        super(message);
    }
}
