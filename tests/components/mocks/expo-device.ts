/**
 * Stub for expo-device in Playwright CT (Vite) builds.
 * On web, Device.deviceType is UNKNOWN — the TitleScreen falls through
 * to viewport heuristics, which is the correct behaviour for CT tests.
 */
export enum DeviceType {
	UNKNOWN = 0,
	PHONE = 1,
	TABLET = 2,
	DESKTOP = 3,
	TV = 4,
}

export const deviceType: DeviceType = DeviceType.UNKNOWN;
export const brand: string | null = null;
export const manufacturer: string | null = null;
export const modelName: string | null = null;
export const deviceYearClass: number | null = null;
export const totalMemory: number | null = null;
export const isDevice = false;
