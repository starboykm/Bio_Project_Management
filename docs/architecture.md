# Architecture

## Product Direction

The system is a modular internal SaaS-style platform for a single bio-organic fertilizer company. The first release focuses on account/password authentication, project and task execution, searchable knowledge capture, CRM records, and basic reporting.

## Modules

- Auth: login, current user, JWT guards, role checks.
- User: staff accounts, roles, module-level permissions, admin management.
- Role: editable role records with per-role permission assignment.
- Translation: editable Chinese/English keyword table used by the frontend language switcher.
- Project: fertilizer trials, demo fields, customer projects, participants, comments, notes, approvals, task-linked progress, results, and reports.
- Task: execution tracking, priorities, workflow status, assignees, project linkage, and project progress sync.
- Notification: per-user in-app notifications for task assignment, progress updates, project changes, and messages.
- Knowledge: folder-style categories, local file upload, articles, tags, permissions, rich-text content, Markdown interoperability, searchable content.
- Form: reusable form definitions, field schema, dashboard/report visibility, and module integration.
- CRM: customers, contacts, dynamic form data, tracking users, opportunity stage, and follow-up notes.
- Report: operational snapshots and project/task/CRM summaries.

## Permission Model

The first version uses database-backed roles plus optional direct user permissions. Roles such as `admin`, `manager`, `member`, and `viewer` expand into module permissions like `project:write`, `task:read`, or `crm:write`; administrators can also create and edit roles in the admin module. Backend guards enforce these permissions per module, while project ownership and participation further restrict project-level access.

## Language Model

Users store a preferred language (`zh` or `en`) on their profile. The frontend loads editable translation rows from the backend and uses the current user's language to render shared navigation, admin tabs, and common labels. The translation table is managed in the admin module.

## Deployment Shapes

- Local development: run backend and frontend directly with npm workspaces.
- Docker Compose: PostgreSQL, Redis, backend, frontend, and upload volume.
- Future cloud deployment: keep configuration in environment variables and split persistent storage into managed PostgreSQL, managed Redis, and object storage.

## First-Version Decisions

- Single-company backend before multi-tenant SaaS.
- Account/password authentication before SSO.
- Local disk attachments before MinIO/S3.
