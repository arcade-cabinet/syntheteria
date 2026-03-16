# Filament Fog (Optional Patch)

## Overview

`react-native-filament` (v1.9.0) does not expose Filament's `View::setFogOptions()` API. Our native Filament view uses **sky** from `DrawSky` (via `useSkybox`) and calls **fog** when `view.setFogOptions` is available (e.g. after applying the optional patch). Fog can be enabled by adding `setFogOptions` to `react-native-filament`’s View wrapper (see “Applying the Fog Patch” below).

## Current Behavior

- **Sky:** Driven by snapshot `DrawSky` — `useSkybox({ color: hexString })` so native has a solid-color sky matching weather.
- **Fog:** Applied when the patch is in use. This repo applies `patches/react-native-filament@1.9.0.patch` via `pnpm.patchedDependencies`; after `pnpm install` and a native rebuild, `view.setFogOptions(...)` runs and fog appears.

## Applying the Fog Patch

The patch is already registered in `package.json` under `pnpm.patchedDependencies`. To use it:

1. Run `pnpm install` so the patch is applied to `react-native-filament@1.9.0`.
2. Rebuild native so the C++ changes are compiled:  
   `npx expo prebuild --platform ios --clean` (or `android`), then `npx expo run:ios` / `run:android`.

To regenerate the patch after editing the library:  
`pnpm patch react-native-filament@1.9.0`, edit the files in the given directory, then `pnpm patch-commit <path>`.

## API (Once Patched)

Our code calls (when present):

```ts
view.setFogOptions({
  enabled: 1,
  distance: 15,
  maximumOpacity: 0.9,
  colorR, colorG, colorB,  // from DrawSky.color [0,1]
});
```

See Filament’s `View::FogOptions` and `setFogOptions` for the full parameter reference and distance-based fog behavior.
