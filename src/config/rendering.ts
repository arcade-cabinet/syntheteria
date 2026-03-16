/**
 * Rendering backend configuration.
 * See docs/technical/RENDERING_BACKENDS.md for WebGPU (web) and Filament (mobile) strategy.
 */

import { isWebPlatform } from "../platform";

/**
 * Use WebGPU on web when true; WebGL fallback otherwise. Ignored on native.
 *
 * WebGPU is opt-IN (VITE_USE_WEBGPU=1) — WebGL is the stable default.
 * Three.js WebGPURenderer has a depth-buffer resize bug on retina displays
 * (depth buffer stays at 300×150 while canvas is 2560×1600, causing every
 * GPU command buffer to be invalid and the scene to render blank).
 * Until Three.js fixes the resize path, leave WebGL as default.
 *
 * To test WebGPU: VITE_USE_WEBGPU=1 pnpm dev
 */
const webgpuEnabled =
	(typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_USE_WEBGPU === "1") ||
	(typeof process !== "undefined" &&
		process.env?.EXPO_PUBLIC_USE_WEBGPU === "1");
export const USE_WEBGPU_WEB = isWebPlatform && webgpuEnabled;
