/**
 * @package resources — REDIRECT
 *
 * Salvage definitions have moved to src/config/resources/.
 * This barrel re-exports for backward compatibility.
 */

export type { SalvageDef, YieldRange } from "../config/resources";
export {
	getAllSalvageModelIds,
	getSalvageTypeForModel,
	SALVAGE_DEFS,
} from "../config/resources";
