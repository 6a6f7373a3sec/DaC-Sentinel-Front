# Client Rule Pipelines Specification

## Purpose

Definir el comportamiento del frontend para administrar pipelines pySigma persistidos por cliente/regla y ejecutar conversiones basadas en esa configuración.

## Requirements

### Requirement: Client pipeline inventory

The system MUST allow an authenticated user to view pipelines associated with a client and optionally narrow the list by rule.

#### Scenario: List pipelines for a client
- GIVEN a client with persisted pipelines
- WHEN the user opens the client pipelines view
- THEN the frontend SHALL request `/clients/{client_id}/pipelines`
- AND it SHALL render pipeline name, rule, backend, format, position and update timestamp

#### Scenario: Filter inventory by rule
- GIVEN the user selected a specific rule within the client context
- WHEN the frontend loads the inventory
- THEN it SHALL send `rule_id` as query param
- AND it SHALL render only the pipelines for that rule

### Requirement: Pipeline CRUD with YAML safeguards

The system MUST allow admins to create, edit and delete client-rule pipelines while preserving backend validation semantics.

#### Scenario: Create pipeline for a client rule
- GIVEN an admin selects a client and a rule
- WHEN the admin submits valid backend, format, position and YAML
- THEN the frontend SHALL call `POST /clients/{client_id}/pipelines`
- AND it SHALL refresh the inventory on success

#### Scenario: Surface validation feedback
- GIVEN the backend returns `warning`, `409` or `422`
- WHEN the request completes
- THEN the frontend MUST show the warning or error message without losing the form state

### Requirement: Rule-scoped conversion by client context

The system MUST allow users to convert a selected rule using the pipelines persisted for the `(client, rule)` combination.

#### Scenario: Convert one rule using client pipelines
- GIVEN a rule has one or more pipelines configured for the client
- WHEN the user triggers conversion for that rule
- THEN the frontend SHALL call `POST /clients/{client_id}/rules/{rule_id}/convert`
- AND it SHALL render the returned backend, format, pipelines used and result

#### Scenario: Handle missing pipeline configuration
- GIVEN the selected rule has no pipelines configured
- WHEN the conversion endpoint returns `422`
- THEN the frontend MUST present an actionable error and keep the user in the client pipelines flow

### Requirement: Batch conversion visibility

The system SHOULD allow users to run client-wide conversion for all rules with configured pipelines and inspect partial failures.

#### Scenario: Convert all configured rules for a client
- GIVEN a client has multiple rules with pipelines
- WHEN the user triggers batch conversion
- THEN the frontend SHALL call `POST /clients/{client_id}/convert-all`
- AND it SHALL display success and error counts

#### Scenario: Show partial rule failures in batch result
- GIVEN the batch response contains per-rule errors
- WHEN the results are rendered
- THEN the frontend MUST keep successful results visible
- AND it MUST list failed rules with their backend error message
