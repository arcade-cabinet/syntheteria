/**
 * @package lib/fog
 *
 * Fog-of-war tile visibility + unit scan detection helpers.
 */

export { buildExploredSet, isTileExplored } from "./tileVisibility";
export type { Scanner } from "./unitDetection";
export { isUnitDetected } from "./unitDetection";
