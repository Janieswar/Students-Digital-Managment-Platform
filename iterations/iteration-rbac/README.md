# Iteration: RBAC — Role-Based Access Control

This directory contains all documentation for implementing RBAC on the CEC Student Digital Platform (Student Lifecycle Management Platform).

## Documents

| # | File | Purpose | Audience |
|---|------|---------|----------|
| -- | `README.md` | This file | Everyone |
| 1 | `01-feature-overview.md` | Requirements, roles, permission matrix, open questions | All stakeholders |
| 2 | `02-use-case-details.md` | Every user scenario with preconditions, steps, postconditions | Developers, QA |
| 3 | `03-architecture-diagrams.md` | Mermaid diagrams: ERD, sequences, component map, flow charts | Architects, developers |
| 4 | `04-ui-designs.md` | Every new/modified screen: layout, fields, states, validation | Frontend developer |
| 5 | `05-database-schema.md` | Complete SQLAlchemy schema, indexes, business rules, migration plan | Backend developer, DBA |
| 6 | `06-api-specification.md` | Full REST API contract for all new endpoints | Frontend dev, QA, backend dev |
| 7 | `07-backend-implementation-guide.md` | Step-by-step FastAPI implementation plan | Backend developer |
| 8 | `08-frontend-implementation-guide.md` | Step-by-step React + Vite implementation plan | Frontend developer |
| 9 | `09-test-cases.md` | All test cases: unit, integration, security, E2E, edge cases | QA, developers |
| 10 | `10-test-automation-guide.md` | How to automate every test case from document 9 | Developer, QA automation |
| 11 | `11-security-specification.md` | Threat model, controls, audit trail, security checklist | Security reviewer, backend dev |
| 12 | `12-migration-cutover-plan.md` | Operational runbook for deploying RBAC | DevOps, on-call engineer |

## Platform Context

- **Institution:** City Engineering College (CEC), Bengaluru, Karnataka
- **Regulators:** VTU, AICTE, NAAC
- **Tech Stack:** React (Vite + TypeScript + Tailwind + shadcn/ui) + FastAPI (Python) + SQLite
- **Primary Roles:** Admin, Faculty, Student
- **Extended Roles:** HOD, Principal, Parent (future phases)

## Reading Order

- **New to the feature?** Start with `01-feature-overview.md`
- **Building backend?** Read `05` -> `06` -> `07`
- **Building frontend?** Read `06` -> `04` -> `08`
- **Writing tests?** Read `09` -> `10`
- **Deploying?** Read `12`
- **Security review?** Read `11`
