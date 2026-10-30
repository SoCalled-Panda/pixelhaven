# Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cells too small on mobile | Coloring feels fiddly | Keep MVP art at 16×16 for tap-first play, or add and test pan/zoom before publishing denser grids |
| Incorrect pointer mapping after resize | Wrong cells get colored | Use bounding-rect mapping; test DPR, zoom, and responsive resizing |
| Save race/stale write | Progress loss | Serialize same-tab writes and compare an optimistic revision inside the IndexedDB write transaction |
| Artwork update invalidates local progress | Wrong colors or corrupted-looking art | Version artwork content; reject incompatible saves unless an explicit migration exists |
| Browser storage cleared | Local progress lost | Add export/import; explain local-first behavior |
| Audio autoplay blocked | Music appears broken | Start after user gesture; handle rejected playback |
| Artwork inconsistency | Product feels unfinished | Define a palette/style guide and validate every asset |
| Large assets slow initial load | Poor first impression | Optimize previews, lazy-load artwork, compress audio appropriately |
| Copyright/licensing issue | Content must be removed | Use original assets or document compatible licenses |
| Scope creep | Gift takes too long | Keep MVP non-goals visible; finish one vertical slice first |
| Reference too derivative | Weak distinct identity | Borrow mood principles, create original layout/art/branding |
| Canvas accessibility limitations | Some users cannot interact | Keep controls in DOM, keyboard support where feasible, visible focus, accessible labels |
