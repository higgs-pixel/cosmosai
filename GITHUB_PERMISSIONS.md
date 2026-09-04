# GitHub Permissions Policy

This document explains how GitHub access is managed for COSMOS AI.

## Repository Ownership

The COSMOS AI repository is owned and managed by the Founder.

Only the Founder should have Admin access.

## Access Levels

| Role | GitHub Permission |
|---|---|
| Founder | Admin |
| Core Developer | Write |
| Intern Developer | Write or Read |
| Research Team | Read only if needed |
| Content Team | No access unless required |
| Design Team | No access unless required |
| Operations Team | No access unless required |

## Rules for Developers

Developers must:

- Work only on assigned tasks
- Create a new branch for every feature or fix
- Open Pull Requests before merging
- Never push directly to `main`
- Never commit secrets or credentials
- Never delete branches without approval
- Never change the license without approval
- Never share repository access with anyone else
- Never copy COSMOS AI code into another project without permission

## Branch Workflow

Use this workflow:

```text
main
└── feature/your-task-name
