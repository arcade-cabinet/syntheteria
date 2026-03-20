/**
 * @package lib
 *
 * Shared utilities used across the codebase.
 */

export type { Chronometry } from "./chronometry";
export {
	computeSunColor,
	computeSunDir,
	TURNS_PER_DAY,
	TURNS_PER_YEAR,
	turnToChronometry,
} from "./chronometry";
export * from "./fog";
export * from "./particles";
export { randomUUID } from "./uuid";
