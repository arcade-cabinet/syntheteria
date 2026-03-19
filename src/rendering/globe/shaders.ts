/**
 * GLSL shaders for the globe scene (title + game).
 *
 * Re-exported from the original title menu shaders.
 * Kept as a separate module so both title and game rendering can import.
 */

// NOTE: These shaders are originally defined in ui/landing/title/shaders.ts.
// We re-export from there so that both title and game rendering can import
// through the rendering package index.
export {
	globeFragmentShader,
	globeVertexShader,
	hypercaneFragmentShader,
	hypercaneVertexShader,
	lightningFragmentShader,
	lightningVertexShader,
	stormFragmentShader,
	stormVertexShader,
} from "../../ui/landing/title/shaders";
