package edu.casetrace.api.exception;

public class CaseNotSolvableException extends RuntimeException {
    public CaseNotSolvableException(long caseId) {
        super("Case " + caseId + " does not have a configured solution.");
    }
}
