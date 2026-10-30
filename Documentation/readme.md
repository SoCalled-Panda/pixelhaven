# Cozy Coloring — Project Documentation

A local-first, cozy pixel-art coloring web app inspired by the atmosphere of rainy-night pixel-art games. This project uses its own artwork, interface, branding, and audio; reference games are inspiration, not assets to reproduce.

## Product baseline
- Audience: initially one person, as a personal gift.
- Core interaction: tap individual cells in a pixel grid to color them.
- Frontend: React + TypeScript + Vite.
- Rendering: HTML Canvas 2D.
- Persistence: IndexedDB; local-first.
- Backend: not required for MVP.
- Visual direction: cozy rainy-night room, cat, amber lights, plum/violet shadows, muted warm palette.
- Audio: user-initiated music and ambience playback.

## Documents
| File | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product goals, users, scope, requirements, acceptance criteria |
| [`full detail checklist.md`](full%20detail%20checklist.md) | Detailed implementation and release checklist |
| [`Architecture.md`](Architecture.md) | Components, boundaries, data flow, design decisions |
| [`pipeline.md`](pipeline.md) | Development, artwork, testing, build, deployment pipeline |
| [`database.md`](database.md) | Client-side persistence model and future server schema |
| [`tech-stack.md`](tech-stack.md) | Selected tools and rationale |
| [`art asset spec.md`](art%20asset%20spec.md) | Artwork format, dimensions, metadata, naming conventions |
| [`coloring engine.md`](coloring%20engine.md) | Grid, input, rendering, history, progress logic |
| [`ui ux design.md`](ui%20ux%20design.md) | Visual design system, screens, interaction principles |
| [`audio spec.md`](audio%20spec.md) | Audio behavior, licensing, browser constraints |
| [`test plan.md`](test%20plan.md) | Unit, integration, accessibility, device and release tests |
| [`roadmap.md`](roadmap.md) | Milestones and implementation order |
| [`decisions.md`](decisions.md) | Architecture decision records and assumptions |
| [`risks.md`](risks.md) | Risks, mitigations, and open questions |

## Getting started
```bash
npm create vite@latest cozy-coloring -- --template react-ts
cd cozy-coloring
npm install
npm install idb
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright
```

Use this documentation as a living specification. When a decision changes, update the relevant document and `DECISIONS.md`.
