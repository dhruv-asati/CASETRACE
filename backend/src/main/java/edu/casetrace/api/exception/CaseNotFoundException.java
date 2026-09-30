package edu.casetrace.api.exception;

public class CaseNotFoundException extends RuntimeException {
    public CaseNotFoundException(long caseId) {
        super("Case " + caseId + " was not found.");
    }
}
