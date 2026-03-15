/**
 * Platform detection for Vite (web) and Capacitor (native wrapper).
 * Use this instead of react-native Platform so game logic and rendering
 * work in both Expo/RN and Vite/Capacitor builds.
 */

/** True when running in a browser (Vite dev/build or Capacitor webview). */
export const isWeb =
	typeof window !== "undefined" && typeof document !== "undefined";

/** True when running in Capacitor native shell (iOS/Android). */
export const isCapacitorNative =
	isWeb &&
	typeof (
		window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
	).Capacitor !== "undefined" &&
	(
		window as unknown as { Capacitor: { isNativePlatform: () => boolean } }
	).Capacitor.isNativePlatform?.() === true;

/** Equivalent to Platform.OS === "web" for code that must run in both Expo and Vite. */
export const isWebPlatform = isWeb;

/** Select a value by platform. Use when porting from Platform.select(). */
export function platformSelect<T>(options: { web?: T; default: T }): T {
	return isWeb && options.web !== undefined ? options.web : options.default;
}
