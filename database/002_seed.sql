-- Fictional CASETRACE sample data: three cases with linked participants and records.
BEGIN;

INSERT INTO location(location_id, name, address, location_type) VALUES
(1, 'Northstar Gallery - Exhibition Hall', '12 Aurora Lane', 'EXHIBITION'),
(2, 'Northstar Gallery - Security Office', '12 Aurora Lane', 'SECURITY'),
(3, 'Northstar Gallery - Cafeteria', '12 Aurora Lane', 'CAFETERIA'),
(4, 'Northstar Gallery - Loading Bay', '12 Aurora Lane', 'SERVICE'),
(5, 'Aster Hotel - Suite 814', '8 Meridian Street', 'HOTEL_ROOM'),
(6, 'Aster Hotel - Service Corridor', '8 Meridian Street', 'CORRIDOR'),
(7, 'Aster Hotel - Lobby', '8 Meridian Street', 'LOBBY'),
(8, 'Aster Hotel - Records Room', '8 Meridian Street', 'OFFICE'),
(9, 'Helix Labs - Prototype Vault', '44 Foundry Road', 'LAB'),
(10, 'Helix Labs - Server Room', '44 Foundry Road', 'LAB'),
(11, 'Helix Labs - East Parking', '44 Foundry Road', 'PARKING'),
(12, 'Helix Labs - Design Studio', '44 Foundry Road', 'OFFICE');

INSERT INTO case_file(case_id, case_code, title, description, incident_at, location_id, status, difficulty) VALUES
(1, 'CT-1047', 'The Missing Diamond', 'A rare blue diamond vanished from a sealed exhibition display during a private viewing.', '2026-05-18 21:42:00+00', 1, 'OPEN', 'MEDIUM'),
(2, 'CT-2081', 'The Locked Room Mystery', 'A signed first-edition manuscript disappeared from a hotel suite locked from the inside.', '2026-06-03 20:15:00+00', 5, 'OPEN', 'HARD'),
(3, 'CT-3093', 'The Vanishing Prototype', 'A prototype sensor was removed from a secured laboratory shortly before its public reveal.', '2026-07-11 19:30:00+00', 9, 'OPEN', 'MEDIUM');

INSERT INTO person(person_id, full_name, age, occupation) VALUES
(101, 'Mira Sen', 34, 'Gallery Curator'), (102, 'Jonah Reed', 29, 'Security Technician'),
(103, 'Leena Kapoor', 41, 'Art Dealer'), (104, 'Omar Vale', 26, 'Gallery Assistant'),
(105, 'Tess Morgan', 52, 'Cafeteria Manager'),
(201, 'Dr. Elias Voss', 48, 'Historian'), (202, 'Nadia Bell', 37, 'Hotel Manager'),
(203, 'Felix Ward', 32, 'Antiquarian'), (204, 'Ruth Chen', 45, 'Housekeeper'), (205, 'Ivo March', 30, 'Courier'),
(301, 'Sana Iqbal', 38, 'Lead Engineer'), (302, 'Dev Malik', 31, 'Researcher'),
(303, 'Priya Nair', 28, 'Investor'), (304, 'Caleb Frost', 43, 'Facilities Manager'),
(305, 'Noah Kim', 24, 'Lab Intern');

INSERT INTO case_person(case_id, person_id, case_role, relationship_to_victim, case_notes) VALUES
(1,101,'SUSPECT','Curator','Controlled the exhibition schedule.'), (1,102,'SUSPECT','Security contractor','Maintained camera and access systems.'),
(1,103,'SUSPECT','Potential buyer','Requested a private viewing.'), (1,104,'SUSPECT','Assistant','Prepared the display room.'), (1,105,'WITNESS',NULL,'Worked the evening shift.'),
(2,201,'SUSPECT','Manuscript appraiser','Was alone in the suite shortly before discovery.'), (2,202,'SUSPECT','Hotel manager','Held emergency master access.'),
(2,203,'SUSPECT','Collector','Had a financial dispute over the manuscript.'), (2,204,'WITNESS',NULL,'Serviced the corridor.'), (2,205,'WITNESS',NULL,'Delivered a parcel.'),
(3,301,'SUSPECT','Project lead','Designed the prototype.'), (3,302,'SUSPECT','Researcher','Had lab access.'),
(3,303,'SUSPECT','Investor','Visited before the reveal.'), (3,304,'SUSPECT','Facilities manager','Managed vault access.'), (3,305,'WITNESS',NULL,'Was in the design studio.');

INSERT INTO evidence(evidence_id, case_id, evidence_code, evidence_type, description, location_id, discovered_at, relevance) VALUES
(1001,1,'D-01','Fiber','A strand of dark blue uniform fiber caught beneath the display hinge.',1,'2026-05-18 22:05+00','HIGH'),
(1002,1,'D-02','Access audit','Maintenance credential used at the service entrance during the blackout.',4,'2026-05-18 22:12+00','CRITICAL'),
(1003,1,'D-03','Phone metadata','A short call linked two participants shortly before the display alarm.',NULL,'2026-05-18 22:20+00','MEDIUM'),
(2001,2,'M-01','Seal fragment','Wax seal residue found on the corridor side of the suite door.',6,'2026-06-03 21:00+00','HIGH'),
(2002,2,'M-02','Key audit','Master key cabinet opened while the manager claimed to be in the lobby.',8,'2026-06-03 21:08+00','CRITICAL'),
(2003,2,'M-03','Parcel record','Courier delivery was logged after the alleged disappearance.',7,'2026-06-03 21:12+00','MEDIUM'),
(3001,3,'P-01','Glove residue','Conductive polymer residue found on the vault latch.',9,'2026-07-11 20:00+00','HIGH'),
(3002,3,'P-02','Badge audit','Temporary research badge opened the east service door.',11,'2026-07-11 20:04+00','CRITICAL'),
(3003,3,'P-03','Vehicle trace','A service van left the lot shortly after a call to the project lead.',11,'2026-07-11 20:10+00','MEDIUM');

INSERT INTO evidence_person(case_id, evidence_id, person_id, connection_type) VALUES
(1,1001,102,'UNIFORM_ACCESS'),(1,1002,102,'CREDENTIAL_OWNER'),(1,1003,101,'CALL_PARTICIPANT'),(1,1003,104,'CALL_PARTICIPANT'),
(2,2001,202,'DOOR_ACCESS'),(2,2002,202,'KEY_CUSTODIAN'),(2,2003,205,'DELIVERY_CONTACT'),
(3,3001,302,'LAB_ACCESS'),(3,3002,302,'BADGE_OWNER'),(3,3003,304,'VEHICLE_OWNER');

INSERT INTO camera(camera_id, case_id, camera_code, location_id) VALUES
(11,1,'G-HALL-01',1),(12,1,'G-SERVICE-02',4),(21,2,'H-CORRIDOR-01',6),(22,2,'H-LOBBY-02',7),
(31,3,'L-VAULT-01',9),(32,3,'L-PARKING-02',11);

INSERT INTO cctv_observation(observation_id, case_id, camera_id, person_id, observed_at, activity, confidence) VALUES
(1101,1,11,103,'2026-05-18 21:34+00','Examined display case',0.980),(1102,1,12,102,'2026-05-18 21:39+00','Entered service corridor carrying tool case',0.910),
(1103,1,11,104,'2026-05-18 21:46+00','Returned to exhibition hall',0.940),
(2101,2,21,202,'2026-06-03 20:09+00','Entered records corridor',0.970),(2102,2,22,202,'2026-06-03 20:19+00','Remained in lobby',0.990),
(2103,2,21,204,'2026-06-03 20:17+00','Pushed linen cart past suite',0.920),
(3101,3,31,302,'2026-07-11 19:25+00','Entered prototype vault',0.960),(3102,3,32,304,'2026-07-11 19:34+00','Drove service van out of east lot',0.940),
(3103,3,31,301,'2026-07-11 19:38+00','Reported prototype missing',0.990);

INSERT INTO access_event(access_event_id, case_id, person_id, location_id, occurred_at, access_type, credential_code) VALUES
(1201,1,102,4,'2026-05-18 21:38+00','ENTRY','M-17'),(1202,1,102,1,'2026-05-18 21:40+00','UNLOCK','M-17'),(1203,1,103,1,'2026-05-18 21:32+00','ENTRY','VIS-03'),
(2201,2,202,8,'2026-06-03 20:10+00','ENTRY','MASTER-02'),(2202,2,201,5,'2026-06-03 20:12+00','ENTRY','SUITE-814'),
(3201,3,302,9,'2026-07-11 19:24+00','ENTRY','R-22'),(3202,3,304,11,'2026-07-11 19:33+00','EXIT','F-04');

INSERT INTO phone_record(call_id, case_id, caller_id, receiver_id, occurred_at, duration_seconds, call_status) VALUES
(1301,1,101,104,'2026-05-18 21:36+00',42,'COMPLETED'),(2301,2,203,205,'2026-06-03 20:06+00',31,'COMPLETED'),
(3301,3,304,302,'2026-07-11 19:20+00',58,'COMPLETED');

INSERT INTO witness_statement(statement_id, case_id, witness_id, subject_id, recorded_at, statement) VALUES
(1401,1,105,102,'2026-05-18 22:30+00','Jonah told me he stayed in the cafeteria from 9:20 PM until 9:50 PM.'),
(2401,2,204,202,'2026-06-03 20:45+00','I saw the manager near the records room around 8:10 PM.'),
(3401,3,305,304,'2026-07-11 20:30+00','The facilities van was still parked outside at about 7:25 PM.');

INSERT INTO vehicle(vehicle_id, case_id, owner_id, registration_number, vehicle_type) VALUES
(401,1,103,'NS-AL-104','Sedan'),(402,2,205,'AS-CR-205','Delivery van'),(403,3,304,'HL-SV-304','Service van');
INSERT INTO vehicle_event(vehicle_event_id, case_id, vehicle_id, location_id, occurred_at, activity) VALUES
(4101,1,401,4,'2026-05-18 21:50+00','Parked at loading bay'),(4201,2,402,7,'2026-06-03 20:21+00','Delivery vehicle departed'),
(4301,3,403,11,'2026-07-11 19:35+00','Exited east parking');

INSERT INTO case_event(event_id, case_id, occurred_at, location_id, event_type, description) VALUES
(1501,1,'2026-05-18 21:42+00',1,'INCIDENT','Gallery staff reported the diamond missing.'),
(2501,2,'2026-06-03 20:15+00',5,'INCIDENT','Manuscript reported missing from locked suite.'),
(3501,3,'2026-07-11 19:30+00',9,'INCIDENT','Prototype inventory discrepancy reported.');

INSERT INTO alibi_claim(claim_id, case_id, person_id, claimed_location_id, claim_start, claim_end, source_statement_id) VALUES
(1601,1,102,3,'2026-05-18 21:20+00','2026-05-18 21:50+00',1401),
(2601,2,202,7,'2026-06-03 20:05+00','2026-06-03 20:20+00',2401),
(3601,3,304,12,'2026-07-11 19:15+00','2026-07-11 19:40+00',3401);

INSERT INTO case_solution(case_id, culprit_id, method, location_id, earliest_correct_at, latest_correct_at, explanation) VALUES
(1,102,'Used a maintenance credential to enter during the display reset, then bypassed the hinge sensor.',1,'2026-05-18 21:38+00','2026-05-18 21:42+00','The access log and service camera place the technician near the hall, contradicting the cafeteria alibi.'),
(2,202,'Used the emergency master key and replaced the door seal to stage a locked-room disappearance.',5,'2026-06-03 20:09+00','2026-06-03 20:15+00','The master key audit and corridor footage place the manager away from the lobby during the claimed alibi.'),
(3,302,'Used a temporary badge to remove the sensor through the vault service route and coordinated the exit.',9,'2026-07-11 19:24+00','2026-07-11 19:30+00','The badge access and vault footage place the researcher inside during the claimed design-studio alibi.');

INSERT INTO solution_evidence(case_id, evidence_id) VALUES
(1,1001),(1,1002),(2,2001),(2,2002),(3,3001),(3,3002);

SELECT setval(pg_get_serial_sequence('location','location_id'), (SELECT max(location_id) FROM location));
SELECT setval(pg_get_serial_sequence('case_file','case_id'), (SELECT max(case_id) FROM case_file));
SELECT setval(pg_get_serial_sequence('person','person_id'), (SELECT max(person_id) FROM person));
SELECT setval(pg_get_serial_sequence('evidence','evidence_id'), (SELECT max(evidence_id) FROM evidence));
SELECT setval(pg_get_serial_sequence('camera','camera_id'), (SELECT max(camera_id) FROM camera));
SELECT setval(pg_get_serial_sequence('cctv_observation','observation_id'), (SELECT max(observation_id) FROM cctv_observation));
SELECT setval(pg_get_serial_sequence('access_event','access_event_id'), (SELECT max(access_event_id) FROM access_event));
SELECT setval(pg_get_serial_sequence('phone_record','call_id'), (SELECT max(call_id) FROM phone_record));
SELECT setval(pg_get_serial_sequence('witness_statement','statement_id'), (SELECT max(statement_id) FROM witness_statement));
SELECT setval(pg_get_serial_sequence('vehicle','vehicle_id'), (SELECT max(vehicle_id) FROM vehicle));
SELECT setval(pg_get_serial_sequence('vehicle_event','vehicle_event_id'), (SELECT max(vehicle_event_id) FROM vehicle_event));
SELECT setval(pg_get_serial_sequence('case_event','event_id'), (SELECT max(event_id) FROM case_event));
SELECT setval(pg_get_serial_sequence('alibi_claim','claim_id'), (SELECT max(claim_id) FROM alibi_claim));

COMMIT;
