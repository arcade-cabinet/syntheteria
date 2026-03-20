/**
 * Building unlock chains — which buildings unlock which others.
 * Building-driven progression replaces the centralized tech tree.
 */
import type { BuildingType } from "../traits";

export interface BuildingTierDef {
	readonly cost: Partial<Record<string, number>>;
	readonly upgradeTurns: number;
	readonly minEpoch: number;
}

export interface BuildingUnlockDef {
	readonly unlocksAtTier2?: readonly BuildingType[];
	readonly unlocksAtTier3?: readonly BuildingType[];
	readonly tiers: {
		readonly 2: BuildingTierDef;
		readonly 3: BuildingTierDef;
	};
}

/** Starter buildings — always available from Epoch 1 */
export const STARTER_BUILDINGS: readonly BuildingType[] = [
	"storm_transmitter",
	"power_box",
	"motor_pool",
	"relay_tower",
	"storage_hub",
	"defense_turret",
];

export const BUILDING_UNLOCK_CHAINS: Partial<
	Record<BuildingType, BuildingUnlockDef>
> = {
	storm_transmitter: {
		unlocksAtTier2: ["power_plant", "solar_array"],
		unlocksAtTier3: ["geothermal_tap"],
		tiers: {
			2: { cost: { iron_ore: 5, steel: 3 }, upgradeTurns: 6, minEpoch: 2 },
			3: {
				cost: { steel: 8, circuits: 4 },
				upgradeTurns: 10,
				minEpoch: 3,
			},
		},
	},
	motor_pool: {
		unlocksAtTier2: ["maintenance_bay"],
		tiers: {
			2: {
				cost: { iron_ore: 6, steel: 4, circuits: 2 },
				upgradeTurns: 8,
				minEpoch: 2,
			},
			3: {
				cost: { steel: 10, circuits: 6, alloy: 3 },
				upgradeTurns: 12,
				minEpoch: 3,
			},
		},
	},
	synthesizer: {
		unlocksAtTier2: ["resource_refinery"],
		tiers: {
			2: {
				cost: { iron_ore: 4, glass: 3 },
				upgradeTurns: 6,
				minEpoch: 2,
			},
			3: {
				cost: { steel: 6, circuits: 4, glass: 3 },
				upgradeTurns: 10,
				minEpoch: 3,
			},
		},
	},
	relay_tower: {
		unlocksAtTier2: ["outpost"],
		tiers: {
			2: {
				cost: { circuits: 4, glass: 2 },
				upgradeTurns: 5,
				minEpoch: 2,
			},
			3: {
				cost: { circuits: 6, steel: 4, alloy: 2 },
				upgradeTurns: 8,
				minEpoch: 3,
			},
		},
	},
	defense_turret: {
		tiers: {
			2: {
				cost: { iron_ore: 5, steel: 3 },
				upgradeTurns: 5,
				minEpoch: 2,
			},
			3: {
				cost: { steel: 8, alloy: 3 },
				upgradeTurns: 8,
				minEpoch: 3,
			},
		},
	},
	maintenance_bay: {
		tiers: {
			2: {
				cost: { steel: 4, circuits: 3 },
				upgradeTurns: 6,
				minEpoch: 2,
			},
			3: {
				cost: { steel: 6, circuits: 4, alloy: 2 },
				upgradeTurns: 8,
				minEpoch: 3,
			},
		},
	},
	analysis_node: {
		tiers: {
			2: {
				cost: { glass: 4, circuits: 3 },
				upgradeTurns: 6,
				minEpoch: 2,
			},
			3: {
				cost: { circuits: 8, alloy: 3, quantum_crystal: 1 },
				upgradeTurns: 10,
				minEpoch: 3,
			},
		},
	},
};

/** Motor Pool tier -> available robot classes */
export const MOTOR_POOL_UNIT_TIERS: Record<number, readonly string[]> = {
	1: ["scout", "worker", "infantry"],
	2: ["scout", "worker", "infantry", "support", "cavalry", "ranged"],
	3: ["scout", "worker", "infantry", "support", "cavalry", "ranged"],
};

/** Motor Pool tier -> max mark level available */
export const MOTOR_POOL_MARK_TIERS: Record<number, number> = {
	1: 1,
	2: 2,
	3: 5,
};

/** Check if a building type is available given the player's current buildings */
export function isBuildingUnlocked(
	buildingType: BuildingType,
	ownedBuildings: ReadonlyMap<BuildingType, number>,
): boolean {
	if ((STARTER_BUILDINGS as readonly string[]).includes(buildingType))
		return true;
	if (buildingType === "synthesizer" || buildingType === "analysis_node")
		return true;

	for (const [ownerType, def] of Object.entries(BUILDING_UNLOCK_CHAINS)) {
		if (!def) continue;
		const ownerTier = ownedBuildings.get(ownerType as BuildingType) ?? 0;
		if (ownerTier >= 2 && def.unlocksAtTier2?.includes(buildingType))
			return true;
		if (ownerTier >= 3 && def.unlocksAtTier3?.includes(buildingType))
			return true;
	}

	if (buildingType === "wormhole_stabilizer") {
		const stormTier = ownedBuildings.get("storm_transmitter") ?? 0;
		const synthTier = ownedBuildings.get("synthesizer") ?? 0;
		return stormTier >= 3 && synthTier >= 3;
	}

	return false;
}
