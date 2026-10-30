# Technology Stack

## Selected MVP stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Types for grid, artwork, commands, and persistence |
| UI | React | Component-based interface and ecosystem |
| Dev/build | Vite | Fast development server and simple static build |
| Rendering | Canvas 2D | Direct control over cell rendering and pointer coordinates |
| Styling | CSS Modules or plain CSS | Fine control over warm, custom visual design |
| Client persistence | IndexedDB via `idb` | Structured and binary client-side data |
| Small preferences | localStorage | Simple volume/theme preferences |
| Unit tests | Vitest | Fast TypeScript testing |
| UI tests | React Testing Library | Test user-visible behavior |
| Browser tests | Playwright | Real browser, resizing, pointer and route checks |
| Hosting | Static host/CDN | No server needed for MVP |
| Future API | ASP.NET Core | Fits developer's existing skills |
| Future database | PostgreSQL | Durable relational cloud persistence |
| Future packaging | Docker | Repeatable API deployment |

## Deliberately excluded initially
- Redis: no current cache, queue, rate-limit, or shared-session requirement.
- Redux: app state is small enough for local hooks and a stable engine instance.
- Phaser: unnecessary for a grid coloring tool unless the project grows into a broader 2D game.
- Backend: no cloud feature currently requires it.
- Kubernetes/microservices: disproportionate to the scale.

## Why not Flutter for this version?
Flutter remains viable and would reuse existing skills. React + TypeScript + Canvas is selected because this is a browser-first product with a focused canvas interaction, browser storage, and web-native layout. The choice is pragmatic, not a claim that Flutter cannot handle it.

## Version policy
Use current stable compatible versions when creating the project; commit the package lockfile. Avoid hard-coding dependency versions in docs unless reproducibility requires them.
