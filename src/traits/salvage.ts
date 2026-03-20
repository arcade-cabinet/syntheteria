/**
 * Salvage traits — harvestable ancient ecumenopolis props.
 *
 * These are the PRIMARY resource source. NOT faction-built.
 * Players break these down for materials.
 */

import { trait } from "koota";

export type SalvageType =
	| "container"
	| "terminal"
	| "vessel"
	| "machinery"
	| "debris"
	| "cargo_crate"
	| "storage_rack"
	| "power_cell"
	| "landing_wreck"
	| "abyssal_relic";

/** Harvestable salvage prop on the board. */
export const SalvageProp = trait({
	tileX: 0,
	tileZ: 0,
	salvageType: "debris" as SalvageType,
	modelId: "",
	harvestDuration: 5,
	hp: 30,
	maxHp: 30,
	consumed: false,
});
