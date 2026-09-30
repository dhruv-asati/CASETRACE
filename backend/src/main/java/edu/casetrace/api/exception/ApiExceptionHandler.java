package edu.casetrace.api.exception;

import edu.casetrace.api.dto.ApiErrorDto;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(CaseNotFoundException.class)
    public ResponseEntity<ApiErrorDto> handleCaseNotFound(CaseNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorDto("CASE_NOT_FOUND", exception.getMessage(), OffsetDateTime.now()));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiErrorDto> handleValidation(HandlerMethodValidationException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("INVALID_REQUEST", "The request contains an invalid value.", OffsetDateTime.now()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorDto> handleConstraintViolation(ConstraintViolationException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("INVALID_REQUEST", "The request contains an invalid value.", OffsetDateTime.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorDto> handleBodyValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("INVALID_REQUEST", "The request body contains an invalid value.", OffsetDateTime.now()));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiErrorDto> handleUnreadableRequest(Exception exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("INVALID_REQUEST", "A request parameter or body value has an invalid format.", OffsetDateTime.now()));
    }

    @ExceptionHandler(InvalidInvestigationRequestException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidRequest(InvalidInvestigationRequestException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("INVALID_REQUEST", exception.getMessage(), OffsetDateTime.now()));
    }

    @ExceptionHandler(CaseNotSolvableException.class)
    public ResponseEntity<ApiErrorDto> handleCaseNotSolvable(CaseNotSolvableException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorDto("CASE_NOT_SOLVABLE", exception.getMessage(), OffsetDateTime.now()));
    }
}
