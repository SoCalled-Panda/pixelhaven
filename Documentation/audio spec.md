# Audio Specification

## 1. Goals
Provide relaxing music and optional environmental ambience without interrupting the coloring activity.

## 2. Features
MVP:
- Play/pause.
- Track selection.
- Volume and mute.
- Persist volume and selected track.
- Keep player mounted across route changes.
- Show loading/error state.
- No automatic audible playback before user interaction.

Optional P1:
- Separate music and ambience channels.
- Crossfade between tracks.
- Rain, fireplace, or forest ambience.
- Remember whether playback was enabled, but require a user gesture when browser policy requires it.

## 3. Browser constraints
Browsers may block audible autoplay. Start playback after a user gesture and handle rejected `play()` promises. Do not assume audio playback succeeded.

## 4. Asset and licensing
Prefer original audio or tracks with explicit permission for the intended distribution. Record:
- Track title and creator.
- Source URL.
- License name and URL.
- Attribution text, if required.
- Whether redistribution and commercial use are permitted.
Do not assume “free download” means free redistribution.

## 5. UX
- Keep volume moderate by default.
- Avoid sudden loud starts.
- Make mute obvious.
- Provide independent ambience controls if both layers are present.
- Do not let sound effects fire repeatedly on every cell tap.
