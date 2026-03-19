import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

type PlacementType =
	| "cell"
	| "edge"
	| "corner"
	| "roof"
	| "prop"
	| "detail"
	| "vertical"
	| "composite";

type Family =
	| "floor"
	| "wall"
	| "door"
	| "roof"
	| "prop"
	| "detail"
	| "column"
	| "stair"
	| "utility";

interface BlenderInventoryModel {
	relativePath: string;
	previewRelativePath: string;
	meshCount: number;
	objectCount: number;
	materials: string[];
	meshNames: string[];
	bounds: {
		width: number;
		depth: number;
		height: number;
	};
}

interface BlenderInventory {
	schemaVersion: number;
	generatedAt: string;
	modelCount: number;
	models: BlenderInventoryModel[];
}

const repoRoot = process.cwd();
const sourceRoot = join(repoRoot, "assets/models/city");
const previewRoot = join(repoRoot, "assets/generated/city-previews");
const generatedRoot = join(repoRoot, "src/config/generated");
const rawInventoryPath = join(generatedRoot, "cityModelInventory.json");
const manifestPath = join(generatedRoot, "cityModelManifest.ts");
const blenderPath = "/opt/homebrew/bin/blender";
const blenderScriptPath = join(repoRoot, "scripts/city_inventory_blender.py");

function normalizeId(value: string) {
	return value
		.replace(/\.glb$/i, "")
		.replace(/[\\/]/g, "_")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();
}

function classifyFamily(path: string): Family {
	if (path.startsWith("Walls/")) return "wall";
	if (path.startsWith("Details/")) return "detail";
	if (path.includes("FloorTile")) return "floor";
	if (path.includes("Door_")) return "door";
	if (path.includes("RoofTile")) return "roof";
	if (path.includes("Props_")) return "prop";
	if (path.includes("Column")) return "column";
	if (path.includes("Stair")) return "stair";
	if (path.includes("Pipes")) return "utility";
	return "prop";
}

function placementTypeFor(path: string, family: Family): PlacementType {
	if (family === "wall" || family === "door") return "edge";
	if (family === "roof") return path.includes("Corner") ? "corner" : "roof";
	if (family === "detail") return "detail";
	if (family === "prop") return "prop";
	if (family === "stair") return "vertical";
	return "cell";
}

function rotationSymmetryFor(path: string, family: Family): 1 | 2 | 4 {
	if (family === "wall" || family === "door" || family === "stair") return 2;
	if (path.includes("Corner")) return 4;
	return 4;
}

function pivotPolicyFor(path: string, placementType: PlacementType) {
	if (placementType === "edge") return "edge_snap";
	if (placementType === "corner") return "corner_snap";
	if (placementType === "roof") return "roof_center";
	if (path.includes("Stair")) return "entry_aligned";
	return "cell_center";
}

function passabilityEffectFor(family: Family, path: string) {
	if (family === "floor") return "walkable";
	if (family === "door") return "portal";
	if (family === "stair") return "vertical_connector";
	if (family === "detail" && path.includes("Arrow")) return "guidance";
	if (family === "roof") return "cover";
	return "blocking";
}

function zoneAffinityFor(family: Family, path: string) {
	if (family === "floor" && path.includes("Hallway"))
		return ["corridor", "core"];
	if (family === "wall" && path.includes("Window"))
		return ["habitation", "core"];
	if (family === "door" && path.includes("Double"))
		return ["storage", "fabrication"];
	if (family === "prop" && path.includes("Computer"))
		return ["core", "fabrication"];
	if (family === "prop" && path.includes("Shelf"))
		return ["storage", "habitation"];
	if (family === "prop" && path.includes("Teleporter"))
		return ["core", "power"];
	if (family === "roof" && path.includes("Pipes"))
		return ["power", "fabrication"];
	if (family === "detail") return ["corridor", "power", "fabrication"];
	return ["core", "power", "fabrication", "storage", "habitation"];
}

function adjacencyBiasFor(family: Family, path: string) {
	if (family === "floor" && path.includes("Corner"))
		return ["wall", "door", "column"];
	if (family === "wall" && path.includes("Window"))
		return ["floor", "roof", "detail"];
	if (family === "door") return ["corridor", "wall", "floor"];
	if (family === "roof") return ["wall", "column", "detail"];
	if (family === "prop") return ["floor", "wall"];
	if (family === "stair") return ["floor", "wall", "roof"];
	return ["floor", "wall", "detail"];
}

function tagsFor(path: string, family: Family) {
	const tags = new Set<string>([family]);
	const lower = path.toLowerCase();
	for (const token of [
		"corner",
		"innercorner",
		"hallway",
		"window",
		"double",
		"single",
		"pipes",
		"vent",
		"plate",
		"computer",
		"shelf",
		"crate",
		"storage",
		"teleporter",
		"stairs",
		"capsule",
		"vessel",
	]) {
		if (lower.includes(token)) {
			tags.add(token.replace("innercorner", "inner-corner"));
		}
	}
	return Array.from(tags);
}

function estimateFootprint(bounds: BlenderInventoryModel["bounds"]) {
	const width = Math.max(1, Math.round(bounds.width / 2) || 1);
	const depth = Math.max(1, Math.round(bounds.depth / 2) || 1);
	const height = Math.max(1, Math.round(bounds.height / 2) || 1);
	return { width, depth, height };
}

function defaultScaleFor(family: Family) {
	if (family === "detail") return 0.9;
	if (family === "prop") return 1;
	return 1;
}

function compositeEligibilityFor(family: Family, path: string) {
	if (family === "prop" && path.includes("Statue")) return ["atrium_cluster"];
	if (family === "stair") return ["tower_stack", "service_block"];
	if (family === "column") return ["tower_stack", "hall_frame"];
	if (family === "roof") return ["roof_shell", "tower_stack"];
	if (family === "wall" || family === "door")
		return ["room_shell", "service_block"];
	if (family === "floor") return ["room_shell", "tower_stack", "service_block"];
	return ["room_shell"];
}

function labelFor(path: string) {
	return basename(path, ".glb").replace(/_/g, " ");
}

function writeManifest(inventory: BlenderInventory) {
	const modelImports: string[] = [];
	const previewImports: string[] = [];
	const entries = inventory.models.map((model, index) => {
		const id = normalizeId(model.relativePath);
		const family = classifyFamily(model.relativePath);
		const placementType = placementTypeFor(model.relativePath, family);
		const modelVar = `cityModelAsset_${index}`;
		const previewVar = `cityPreviewAsset_${index}`;
		modelImports.push(
			`import ${modelVar} from "../../../assets/models/city/${model.relativePath.replaceAll("\\\\", "/")}";`,
		);
		previewImports.push(
			`import ${previewVar} from "../../../${model.previewRelativePath.replaceAll("\\\\", "/")}";`,
		);
		return `		{
			id: "${id}",
			label: ${JSON.stringify(labelFor(model.relativePath))},
			sourceAsset: ${modelVar},
			sourceAssetPath: "${model.relativePath}",
			previewAsset: ${previewVar},
			previewAssetPath: "${model.previewRelativePath}",
			family: "${family}",
			subcategory: ${JSON.stringify(dirname(model.relativePath) === "." ? family : dirname(model.relativePath).replaceAll("\\\\", "/"))},
			placementType: "${placementType}",
			footprint: ${JSON.stringify(estimateFootprint(model.bounds))},
			defaultScale: ${defaultScaleFor(family)},
			defaultRotation: 0,
			rotationSymmetry: ${rotationSymmetryFor(model.relativePath, family)},
			pivotPolicy: "${pivotPolicyFor(model.relativePath, placementType)}",
			passabilityEffect: "${passabilityEffectFor(family, model.relativePath)}",
			zoneAffinity: ${JSON.stringify(zoneAffinityFor(family, model.relativePath))},
			adjacencyBias: ${JSON.stringify(adjacencyBiasFor(family, model.relativePath))},
			compositeEligibility: ${JSON.stringify(compositeEligibilityFor(family, model.relativePath))},
			tags: ${JSON.stringify(tagsFor(model.relativePath, family))},
			bounds: ${JSON.stringify(model.bounds)},
			meshCount: ${model.meshCount},
			objectCount: ${model.objectCount},
			materials: ${JSON.stringify(model.materials)},
			meshNames: ${JSON.stringify(model.meshNames)},
		}`;
	});

	const contents = `${modelImports.join("\n")}
${previewImports.join("\n")}

import type { AssetModule } from "../assetUri";

export type CityFamily =
	| "floor"
	| "wall"
	| "door"
	| "roof"
	| "prop"
	| "detail"
	| "column"
	| "stair"
	| "utility";

export type CityPlacementType =
	| "cell"
	| "edge"
	| "corner"
	| "roof"
	| "prop"
	| "detail"
	| "vertical"
	| "composite";

export interface CityModelDefinition {
	id: string;
	label: string;
	sourceAsset: AssetModule;
	sourceAssetPath: string;
	previewAsset: AssetModule;
	previewAssetPath: string;
	family: CityFamily;
	subcategory: string;
	placementType: CityPlacementType;
	footprint: {
		width: number;
		depth: number;
		height: number;
	};
	defaultScale: number;
	defaultRotation: number;
	rotationSymmetry: 1 | 2 | 4;
	pivotPolicy: string;
	passabilityEffect: string;
	zoneAffinity: string[];
	adjacencyBias: string[];
	compositeEligibility: string[];
	tags: string[];
	bounds: {
		width: number;
		depth: number;
		height: number;
	};
	meshCount: number;
	objectCount: number;
	materials: string[];
	meshNames: string[];
}

export interface CityModelManifest {
	schemaVersion: number;
	generatedAt: string;
	modelCount: number;
	models: CityModelDefinition[];
}

export const cityModelManifest: CityModelManifest = {
	schemaVersion: ${inventory.schemaVersion},
	generatedAt: ${JSON.stringify(inventory.generatedAt)},
	modelCount: ${inventory.modelCount},
	models: [
${entries.join(",\n")}
	],
};
`;
	writeFileSync(manifestPath, contents);
}

mkdirSync(previewRoot, { recursive: true });
mkdirSync(generatedRoot, { recursive: true });

try {
	execFileSync(
		blenderPath,
		[
			"--background",
			"--factory-startup",
			"--python",
			blenderScriptPath,
			"--",
			"--source-root",
			sourceRoot,
			"--preview-root",
			previewRoot,
			"--output-json",
			rawInventoryPath,
			"--repo-root",
			repoRoot,
		],
		{ stdio: "inherit" },
	);
} catch (error) {
	console.error("City ingest failed while generating Blender previews.");
	throw error;
}

const inventory = JSON.parse(
	readFileSync(rawInventoryPath, "utf8"),
) as BlenderInventory;

writeManifest(inventory);
console.log(
	`Generated city manifest for ${inventory.modelCount} models at ${relative(repoRoot, manifestPath)}`,
);
