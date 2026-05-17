# Process Flow PoC V1

Next.js + React + TypeScript + Tailwind implementation for the V1 process flow template/instance proposal.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Persistence

The app simulates server-maintained data with seed catalog data and browser `localStorage`.

- Catalog additions: `process-flow.catalog.v1`
- Instances: `process-flow.instances.v1`

JSON exports are downloaded directly from the browser.
