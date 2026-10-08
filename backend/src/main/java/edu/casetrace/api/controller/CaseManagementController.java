package edu.casetrace.api.controller;

import edu.casetrace.api.dto.CaseManagementRequests.*;
import edu.casetrace.api.security.InvestigatorPrincipal;
import edu.casetrace.api.service.CaseManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/cases/{caseId}")
public class CaseManagementController {
    private final CaseManagementService service;

    public CaseManagementController(CaseManagementService service) { this.service = service; }

    @PutMapping
    public ResponseEntity<Void> update(@PathVariable @Positive long caseId, @Valid @RequestBody UpdateCaseRequest body,
                                       @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.update(caseId, principal.getInvestigatorId(), body);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/status")
    public ResponseEntity<Void> status(@PathVariable @Positive long caseId, @Valid @RequestBody UpdateStatusRequest body,
                                      @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.status(caseId, principal.getInvestigatorId(), body.status());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@PathVariable @Positive long caseId,
                                       @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.delete(caseId, principal.getInvestigatorId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/participants")
    public java.util.List<CasePersonDto> participants(@PathVariable @Positive long caseId) { return service.participants(caseId); }

    @GetMapping("/timeline-records")
    public java.util.List<CaseEventDto> timelineRecords(@PathVariable @Positive long caseId) { return service.caseEvents(caseId); }

    @PutMapping("/people/{recordId}")
    public ResponseEntity<Void> updatePerson(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreatePersonRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updatePerson(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/people/{recordId}")
    public ResponseEntity<Void> deletePerson(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deletePerson(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/evidence/{recordId}")
    public ResponseEntity<Void> updateEvidence(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateEvidenceRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateEvidence(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/evidence/{recordId}")
    public ResponseEntity<Void> deleteEvidence(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteEvidence(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/cctv/{recordId}")
    public ResponseEntity<Void> updateCctv(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateCctvRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateCctv(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/cctv/{recordId}")
    public ResponseEntity<Void> deleteCctv(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteCctv(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/access-logs/{recordId}")
    public ResponseEntity<Void> updateAccess(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateAccessRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateAccess(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/access-logs/{recordId}")
    public ResponseEntity<Void> deleteAccess(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteAccess(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/phone-records/{recordId}")
    public ResponseEntity<Void> updatePhone(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreatePhoneRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updatePhone(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/phone-records/{recordId}")
    public ResponseEntity<Void> deletePhone(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deletePhone(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/witness-statements/{recordId}")
    public ResponseEntity<Void> updateStatement(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateStatementRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateStatement(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/witness-statements/{recordId}")
    public ResponseEntity<Void> deleteStatement(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteStatement(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/vehicles/{recordId}")
    public ResponseEntity<Void> updateVehicle(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateVehicleRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateVehicle(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/vehicles/{recordId}")
    public ResponseEntity<Void> deleteVehicle(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteVehicle(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/vehicle-logs/{recordId}")
    public ResponseEntity<Void> updateVehicleEvent(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateVehicleEventRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateVehicleEvent(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/vehicle-logs/{recordId}")
    public ResponseEntity<Void> deleteVehicleEvent(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteVehicleEvent(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }
    @PutMapping("/timeline/{recordId}")
    public ResponseEntity<Void> updateTimeline(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @Valid @RequestBody CreateTimelineRequest body, @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.updateTimeline(caseId, principal.getInvestigatorId(), recordId, body); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/timeline/{recordId}")
    public ResponseEntity<Void> deleteTimeline(@PathVariable @Positive long caseId, @PathVariable @Positive long recordId,
            @AuthenticationPrincipal InvestigatorPrincipal principal) {
        service.deleteTimeline(caseId, principal.getInvestigatorId(), recordId); return ResponseEntity.noContent().build();
    }

    @PostMapping("/people")
    public ResponseEntity<CreatedRecord> person(@PathVariable @Positive long caseId, @Valid @RequestBody CreatePersonRequest body,
                                                 @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.person(caseId, principal.getInvestigatorId(), body), "Person added to case.");
    }

    @PostMapping("/evidence")
    public ResponseEntity<CreatedRecord> evidence(@PathVariable @Positive long caseId, @Valid @RequestBody CreateEvidenceRequest body,
                                                  @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.evidence(caseId, principal.getInvestigatorId(), body), "Evidence added to case.");
    }

    @PostMapping("/cctv")
    public ResponseEntity<CreatedRecord> cctv(@PathVariable @Positive long caseId, @Valid @RequestBody CreateCctvRequest body,
                                               @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.cctv(caseId, principal.getInvestigatorId(), body), "CCTV observation added.");
    }

    @PostMapping("/access-logs")
    public ResponseEntity<CreatedRecord> access(@PathVariable @Positive long caseId, @Valid @RequestBody CreateAccessRequest body,
                                                 @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.access(caseId, principal.getInvestigatorId(), body), "Access log added.");
    }

    @PostMapping("/phone-records")
    public ResponseEntity<CreatedRecord> phone(@PathVariable @Positive long caseId, @Valid @RequestBody CreatePhoneRequest body,
                                                @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.phone(caseId, principal.getInvestigatorId(), body), "Phone record added.");
    }

    @PostMapping("/witness-statements")
    public ResponseEntity<CreatedRecord> statement(@PathVariable @Positive long caseId, @Valid @RequestBody CreateStatementRequest body,
                                                    @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.statement(caseId, principal.getInvestigatorId(), body), "Witness statement added.");
    }

    @PostMapping("/vehicles")
    public ResponseEntity<CreatedRecord> vehicle(@PathVariable @Positive long caseId, @Valid @RequestBody CreateVehicleRequest body,
                                                  @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.vehicle(caseId, principal.getInvestigatorId(), body), "Vehicle added to case.");
    }

    @PostMapping("/vehicle-logs")
    public ResponseEntity<CreatedRecord> vehicleEvent(@PathVariable @Positive long caseId, @Valid @RequestBody CreateVehicleEventRequest body,
                                                       @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.vehicleEvent(caseId, principal.getInvestigatorId(), body), "Vehicle movement added.");
    }

    @PostMapping("/timeline")
    public ResponseEntity<CreatedRecord> timeline(@PathVariable @Positive long caseId, @Valid @RequestBody CreateTimelineRequest body,
                                                   @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return created(service.timeline(caseId, principal.getInvestigatorId(), body), "Timeline event added.");
    }

    private static ResponseEntity<CreatedRecord> created(long id, String message) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedRecord(id, message));
    }
}
