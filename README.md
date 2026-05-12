# Process Flow Template/Instance PoC

This repository contains a lightweight proof of concept for describing advanced packaging process flows through reusable process flow templates and TV/Product instances.

The first target user is the simulation team. The goal is to create a shared process-state language that makes it easier to align with integration engineers before FEM or thermal model construction begins.

## What This PoC Demonstrates

- A `ProcessFlowTemplate` for packaging process flows such as CoWoS-L, CoWoS-S, or CoWoS-R.
- Clear separation between template `id` as the DB/API reference key and template `name` as the package technology name.
- A `ProcessFlowInstance` for TV/Product flows such as MI450 or GR100.
- Version-locked instances: each TV/Product keeps the process flow template version it was created from.
- A browser UI for selecting process flow templates, creating TV/Product instances, navigating process steps, editing station values, tracking sources, assumptions, unknowns, attachments, and review status.
- Traditional Chinese project and development documents for stakeholder review.

## Run Locally

```bash
npm run serve
```

Then open:

```text
http://localhost:4173
```

## Test

```bash
npm test
```

## Key Files

- `index.html` - static app entrypoint.
- `src/domain.js` - core template/instance model logic.
- `src/sample-data.js` - representative CoWoS-L process flow template and MI450/GR100 instances.
- `data/process-flow.schema.json` - JSON Schema for the PoC data contract.
- `docs/project-proposal.md` - project proposal for management alignment.
- `docs/development-document.md` - implementation-oriented design document.
