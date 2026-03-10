/**
 * Unit tests for assetResolver.ts — game entity to 3D model path mapping.
 *
 * Verifies that the asset mapping config correctly maps all game entity
 * types to 3DPSX model paths, and that variant selection is deterministic.
 */

jest.mock("../../../config/assetMapping.json", () => ({
	_description: "test asset mapping",
	_assetRoot: "/Volumes/home/assets/3DPSX",
	buildings: {
		furnace: {
			models: [
				"PSX Mega Pack II v1.8/Large Props & Machinery/distillery_mx_1.glb",
				"PSX Mega Pack II v1.8/Large Props & Machinery/chimney_a_1.glb",
			],
			description: "Industrial furnace for smelting cubes",
			scale: 1.0,
		},
		turret: {
			models: [
				"PSX Mega Pack II v1.8/Large Props & Machinery/machinery_mx_1.glb",
			],
			description: "Automated defense turret",
			scale: 0.8,
		},
		lightning_rod: {
			models: [
				"PSX Mega Pack II v1.8/Large Props & Machinery/electrical_equipment_1.glb",
				"PSX Mega Pack II v1.8/Large Props & Machinery/electrical_equipment_2.glb",
			],
			description: "Power collection from storms",
			scale: 1.0,
		},
	},
	infrastructure: {
		pipe_straight: {
			models: [
				"Props/Electrical/Pipe_V1_Straight.glb",
				"Props/Electrical/Pipe_V2_Straight.glb",
			],
			description: "Straight pipe section",
		},
		valve: {
			models: ["Props/Electrical/Valve.glb"],
			description: "Flow control valve",
		},
	},
	terrain: {
		debris: {
			models: [
				"PSX Mega Pack II v1.8/Debris & Misc/brick_mx_1.glb",
				"PSX Mega Pack II v1.8/Debris & Misc/brick_mx_2.glb",
				"PSX Mega Pack II v1.8/Debris & Misc/brick_mx_3.glb",
			],
			description: "Scattered rubble",
		},
	},
	props: {
		tools: {
			pickaxe: {
				models: ["Props/Tools/Pickaxe/Pickaxe.glb"],
				description: "Mining pickaxe",
			},
		},
		weapons: {
			revolver: {
				models: ["Props/Weapons/HandCannon/Gun/Revolver.glb"],
				description: "Industrial revolver",
			},
			chainsaw: {
				models: ["Props/Weapons/Chainsaw_2.0/Chainsaw.glb"],
				description: "Chainsaw harvester",
			},
		},
		machinery_variants: {
			models: [
				"Props/Electrical/Machinery_4.glb",
				"Props/Electrical/Machinery_5.glb",
			],
			description: "Decorative machinery",
		},
	},
	environment: {
		nature: { trees: { path: "Environment/Nature/Trees" } },
	},
	characters: {
		player_bot_base: { path: "Characters/ChibiCharacters" },
	},
	factionVisualOverrides: {
		reclaimers: {
			materialTint: "#8B4513",
			roughness: 0.9,
			metalness: 0.3,
		},
		volt_collective: {
			materialTint: "#4488CC",
			roughness: 0.2,
			metalness: 0.9,
			emissiveColor: "#2266AA",
		},
		signal_choir: {
			materialTint: "#88AA88",
			roughness: 0.4,
			metalness: 0.7,
			emissiveColor: "#44CC44",
		},
		iron_creed: {
			materialTint: "#777777",
			roughness: 0.5,
			metalness: 0.8,
		},
	},
}));

import {
	resolveBuilding,
	resolveInfrastructure,
	resolveTerrain,
	resolveProp,
	getFactionOverride,
	getAvailableBuildingTypes,
	getAvailableInfrastructureTypes,
	getBuildingVariantCount,
	getAssetRoot,
} from "../assetResolver";

// ---------------------------------------------------------------------------
// resolveBuilding
// ---------------------------------------------------------------------------

describe("resolveBuilding", () => {
	it("resolves furnace to a valid model path", () => {
		const result = resolveBuilding("furnace", "furnace-1");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toMatch(/\.glb$/);
		expect(result!.description).toBe("Industrial furnace for smelting cubes");
	});

	it("respects configured scale", () => {
		const turret = resolveBuilding("turret", "turret-1");
		expect(turret!.scale).toBe(0.8);

		const furnace = resolveBuilding("furnace", "furnace-1");
		expect(furnace!.scale).toBe(1.0);
	});

	it("returns null for unknown building type", () => {
		expect(resolveBuilding("nonexistent", "id-1")).toBeNull();
	});

	it("selects variant deterministically", () => {
		const a = resolveBuilding("furnace", "furnace-42");
		const b = resolveBuilding("furnace", "furnace-42");
		expect(a!.modelPath).toBe(b!.modelPath);
	});

	it("different entity IDs may select different variants", () => {
		const paths = new Set<string>();
		for (let i = 0; i < 20; i++) {
			const result = resolveBuilding("furnace", `furnace-${i}`);
			paths.add(result!.modelPath);
		}
		// With 2 variants, should see both eventually
		expect(paths.size).toBe(2);
	});

	it("applies faction override when provided", () => {
		const result = resolveBuilding("furnace", "furnace-1", "reclaimers");
		expect(result!.factionOverride).not.toBeNull();
		expect(result!.factionOverride!.materialTint).toBe("#8B4513");
	});

	it("no faction override when no faction provided", () => {
		const result = resolveBuilding("furnace", "furnace-1");
		expect(result!.factionOverride).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveInfrastructure
// ---------------------------------------------------------------------------

describe("resolveInfrastructure", () => {
	it("resolves pipe_straight", () => {
		const result = resolveInfrastructure("pipe_straight", "pipe-1");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toMatch(/Pipe.*Straight\.glb$/);
	});

	it("resolves valve", () => {
		const result = resolveInfrastructure("valve", "valve-1");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toContain("Valve.glb");
	});

	it("returns null for unknown piece type", () => {
		expect(resolveInfrastructure("nonexistent", "id-1")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveTerrain
// ---------------------------------------------------------------------------

describe("resolveTerrain", () => {
	it("resolves debris with variants", () => {
		const paths = new Set<string>();
		for (let i = 0; i < 30; i++) {
			const result = resolveTerrain("debris", `debris-${i}`);
			expect(result).not.toBeNull();
			paths.add(result!.modelPath);
		}
		// With 3 variants, should see all 3
		expect(paths.size).toBe(3);
	});

	it("returns null for unknown terrain type", () => {
		expect(resolveTerrain("lava", "id-1")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveProp
// ---------------------------------------------------------------------------

describe("resolveProp", () => {
	it("resolves nested prop path (tools.pickaxe)", () => {
		const result = resolveProp("tools.pickaxe");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toContain("Pickaxe.glb");
	});

	it("resolves nested prop path (weapons.revolver)", () => {
		const result = resolveProp("weapons.revolver");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toContain("Revolver.glb");
	});

	it("resolves top-level prop (machinery_variants)", () => {
		const result = resolveProp("machinery_variants");
		expect(result).not.toBeNull();
		expect(result!.modelPath).toMatch(/Machinery.*\.glb$/);
	});

	it("returns null for unknown prop path", () => {
		expect(resolveProp("nonexistent.thing")).toBeNull();
	});

	it("returns null for partially valid path", () => {
		expect(resolveProp("tools.nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getFactionOverride
// ---------------------------------------------------------------------------

describe("getFactionOverride", () => {
	it("returns Reclaimers override — rusty iron", () => {
		const override = getFactionOverride("reclaimers");
		expect(override).not.toBeNull();
		expect(override!.roughness).toBe(0.9);
		expect(override!.metalness).toBe(0.3);
	});

	it("returns Volt Collective override — chrome + blue emissive", () => {
		const override = getFactionOverride("volt_collective");
		expect(override).not.toBeNull();
		expect(override!.metalness).toBe(0.9);
		expect(override!.emissiveColor).toBe("#2266AA");
	});

	it("returns Signal Choir override — green glow", () => {
		const override = getFactionOverride("signal_choir");
		expect(override!.emissiveColor).toBe("#44CC44");
	});

	it("returns Iron Creed override — brushed steel", () => {
		const override = getFactionOverride("iron_creed");
		expect(override!.roughness).toBe(0.5);
		expect(override!.metalness).toBe(0.8);
	});

	it("returns null for unknown faction", () => {
		expect(getFactionOverride("unknown_faction")).toBeNull();
	});

	// PAPER PLAYTEST ASSERTION: all 4 game factions must have visual overrides
	it("all four factions have overrides", () => {
		expect(getFactionOverride("reclaimers")).not.toBeNull();
		expect(getFactionOverride("volt_collective")).not.toBeNull();
		expect(getFactionOverride("signal_choir")).not.toBeNull();
		expect(getFactionOverride("iron_creed")).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("asset queries", () => {
	it("lists available building types", () => {
		const types = getAvailableBuildingTypes();
		expect(types).toContain("furnace");
		expect(types).toContain("turret");
		expect(types).toContain("lightning_rod");
	});

	it("lists available infrastructure types", () => {
		const types = getAvailableInfrastructureTypes();
		expect(types).toContain("pipe_straight");
		expect(types).toContain("valve");
	});

	it("reports correct variant count", () => {
		expect(getBuildingVariantCount("furnace")).toBe(2);
		expect(getBuildingVariantCount("turret")).toBe(1);
		expect(getBuildingVariantCount("nonexistent")).toBe(0);
	});

	it("returns correct asset root", () => {
		expect(getAssetRoot()).toBe("/Volumes/home/assets/3DPSX");
	});
});
