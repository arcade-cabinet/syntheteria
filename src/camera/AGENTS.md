# camera/

Camera controllers — sphere orbit camera for the planet view.

## Rules
- **SphereOrbitCamera is the primary camera** — orbits around (0,0,0), WASD rotates globe
- **CameraControls interface** — for programmatic camera moves (panTo, snapTo)
- **cameraStore is the singleton accessor** — `registerCameraControls()` / `getCameraControls()`
- **cutawayStore handles cutaway planes** — distance-based terrain cutaway for close zoom

## Public API
- `SphereOrbitCamera` — R3F camera component (orbit around sphere)
- `CameraControls` — interface for programmatic camera control
- `registerCameraControls()`, `getCameraControls()` — camera singleton
- `updateCutaway(distance)`, `getCutawayPlane()`, `isCutawayActive()` — cutaway system

## Files
| File | Purpose |
|------|---------|
| SphereOrbitCamera.tsx | Sphere orbit camera component (Planetary Annihilation style) |
| cameraStore.ts | Camera controls singleton registration |
| cutawayStore.ts | Distance-based terrain cutaway plane |
| types.ts | `CameraControls` interface |
