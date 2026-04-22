# Admin Ops Exposure Specification

## Purpose

Expose in the frontend the administrative operations already available in the backend so operators can maintain repositories, observe export jobs, and reload runtime settings without leaving the app.

## Requirements

### Requirement: Admin-only operational surface

The system MUST expose admin operational actions only to authenticated admin users.

#### Scenario: Admin sees operational controls
- GIVEN an authenticated admin user
- WHEN the user opens the Admin area
- THEN the frontend SHALL render the operational controls for repos, export jobs, and settings reload

#### Scenario: Non-admin cannot access operational controls
- GIVEN an authenticated non-admin user
- WHEN the user navigates to the Admin area
- THEN the frontend MUST NOT render the operational controls
- AND it MUST keep the user on the authorized view set

### Requirement: Repository source editing

The system MUST allow admins to inspect and update an existing repository source from the frontend.

#### Scenario: Edit a repository source
- GIVEN an existing repository source
- WHEN the admin opens its edit flow and saves changes
- THEN the frontend SHALL request the repo detail and submit an update for name, branch, rules subpath, or active state
- AND it SHALL refresh the repository list after success

#### Scenario: Handle invalid or missing repository updates
- GIVEN the backend rejects the update or the repository no longer exists
- WHEN the admin saves the form
- THEN the frontend MUST show the error message
- AND it MUST preserve the current edit context

### Requirement: Export job monitoring

The system MUST allow admins to list and inspect recent export jobs from the frontend.

#### Scenario: View export jobs
- GIVEN an admin opens the export jobs view
- WHEN the frontend loads the panel
- THEN it SHALL request `GET /export/jobs`
- AND it SHALL render the returned jobs so the admin can identify active or recent exports

#### Scenario: No export jobs are available
- GIVEN the backend returns an empty job list
- WHEN the jobs view renders
- THEN the frontend MUST show an empty-state message instead of an error

### Requirement: Runtime settings reload

The system MUST allow admins to reload runtime settings from the current environment without leaving the app.

#### Scenario: Reload settings successfully
- GIVEN an admin is in the Admin area
- WHEN the admin triggers a settings reload
- THEN the frontend SHALL call the settings reload endpoint
- AND it SHALL present the refreshed response or snapshot returned by the backend

#### Scenario: Reload settings fails
- GIVEN the reload endpoint returns an error
- WHEN the admin triggers the action
- THEN the frontend MUST show the error
- AND it MUST keep the current page state intact
