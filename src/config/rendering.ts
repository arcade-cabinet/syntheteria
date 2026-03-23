/**
 * Rendering backend configuration.
 * See docs/technical/RENDERING_BACKENDS.md for WebGPU (web) and Filament (mobile) strategy.
 */

import { isWebPlatform } from "../platform";

/** Use WebGPU on web when true; WebGL fallback otherwise. Ignored on native. */
const webgpuDisabled =
	(typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_USE_WEBGPU === "0") ||
	(typeof process !== "undefined" &&
		process.env?.EXPO_PUBLIC_USE_WEBGPU === "0");
export const USE_WEBGPU_WEB = isWebPlatform && !webgpuDisabled;
