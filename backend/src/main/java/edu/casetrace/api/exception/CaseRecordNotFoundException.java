package edu.casetrace.api.exception;

public class CaseRecordNotFoundException extends RuntimeException {
    public CaseRecordNotFoundException(String recordType, long recordId, long caseId) {
        super(recordType + " " + recordId + " was not found in case " + caseId + ".");
    }
}
