package edu.casetrace.api.exception;

public class CaseOwnershipException extends RuntimeException {
    public CaseOwnershipException() {
        super("Only the investigator who created this case may change it.");
    }
}
