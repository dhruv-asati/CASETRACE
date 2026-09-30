package edu.casetrace.api.controller;

import edu.casetrace.api.dto.ContradictionDto;
import edu.casetrace.api.dto.AccessLogDto;
import edu.casetrace.api.dto.CctvRecordDto;
import edu.casetrace.api.dto.ConnectionDto;
import edu.casetrace.api.dto.EvidenceDto;
import edu.casetrace.api.dto.InvestigationSearchResultDto;
import edu.casetrace.api.dto.PhoneRecordDto;
import edu.casetrace.api.dto.SolveCaseRequest;
import edu.casetrace.api.dto.SolveCaseResponse;
import edu.casetrace.api.dto.SuspectDto;
import edu.casetrace.api.dto.TimelineEventDto;
import edu.casetrace.api.dto.VehicleDto;
import edu.casetrace.api.dto.VehicleLogDto;
import edu.casetrace.api.dto.WitnessDto;
import edu.casetrace.api.dto.WitnessStatementDto;
import edu.casetrace.api.service.InvestigationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/cases/{caseId}")
public class InvestigationController {
    private final InvestigationService investigationService;

    public InvestigationController(InvestigationService investigationService) {
        this.investigationService = investigationService;
    }

    @GetMapping("/suspects")
    public List<SuspectDto> getSuspects(@PathVariable @Positive long caseId) {
        return investigationService.getSuspects(caseId);
    }

    @GetMapping("/evidence")
    public List<EvidenceDto> getEvidence(@PathVariable @Positive long caseId) {
        return investigationService.getEvidence(caseId);
    }

    @GetMapping("/timeline")
    public List<TimelineEventDto> getTimeline(@PathVariable @Positive long caseId) {
        return investigationService.getTimeline(caseId);
    }

    @GetMapping("/contradictions")
    public List<ContradictionDto> getContradictions(@PathVariable @Positive long caseId) {
        return investigationService.getContradictions(caseId);
    }

    @GetMapping("/cctv")
    public List<CctvRecordDto> getCctv(
            @PathVariable @Positive long caseId,
            @RequestParam(required = false) @Positive Long personId,
            @RequestParam(required = false) @Positive Long locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startAt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endAt) {
        return investigationService.getCctv(caseId, personId, locationId, startAt, endAt);
    }

    @GetMapping("/access-logs")
    public List<AccessLogDto> getAccessLogs(
            @PathVariable @Positive long caseId,
            @RequestParam(required = false) @Positive Long personId,
            @RequestParam(required = false) @Positive Long locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startAt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endAt) {
        return investigationService.getAccessLogs(caseId, personId, locationId, startAt, endAt);
    }

    @GetMapping("/phone-records")
    public List<PhoneRecordDto> getPhoneRecords(@PathVariable @Positive long caseId) {
        return investigationService.getPhoneRecords(caseId);
    }

    @GetMapping("/witnesses")
    public List<WitnessDto> getWitnesses(@PathVariable @Positive long caseId) {
        return investigationService.getWitnesses(caseId);
    }

    @GetMapping("/witness-statements")
    public List<WitnessStatementDto> getWitnessStatements(@PathVariable @Positive long caseId) {
        return investigationService.getWitnessStatements(caseId);
    }

    @GetMapping("/vehicles")
    public List<VehicleDto> getVehicles(@PathVariable @Positive long caseId) {
        return investigationService.getVehicles(caseId);
    }

    @GetMapping("/vehicle-logs")
    public List<VehicleLogDto> getVehicleLogs(
            @PathVariable @Positive long caseId,
            @RequestParam(required = false) @Positive Long ownerId,
            @RequestParam(required = false) @Positive Long locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startAt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endAt) {
        return investigationService.getVehicleLogs(caseId, ownerId, locationId, startAt, endAt);
    }

    @GetMapping("/investigate")
    public List<InvestigationSearchResultDto> investigate(
            @PathVariable @Positive long caseId,
            @RequestParam(required = false) @Positive Long personId,
            @RequestParam(required = false) @Positive Long locationId,
            @RequestParam(required = false) @Size(max = 160) String keyword,
            @RequestParam(required = false) @Size(max = 80) String eventType,
            @RequestParam(required = false) @Size(max = 80) String evidenceType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startAt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endAt) {
        return investigationService.search(caseId, personId, locationId, keyword, eventType,
                evidenceType, startAt, endAt);
    }

    @GetMapping("/connections")
    public List<ConnectionDto> getConnections(@PathVariable @Positive long caseId) {
        return investigationService.getConnections(caseId);
    }

    @PostMapping("/solve")
    public ResponseEntity<SolveCaseResponse> solve(
            @PathVariable @Positive long caseId,
            @Valid @RequestBody SolveCaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(investigationService.solve(caseId, request));
    }
}
