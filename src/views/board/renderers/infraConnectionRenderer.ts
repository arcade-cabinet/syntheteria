/**
 * infraConnectionRenderer — draws pipe/cable connections between nearby buildings.
 *
 * When two buildings are within connection range, places pipeline or power line
 * models along the path between them. Uses IMPROVEMENT_MODELS from config.
 * Rebuilds each turn (connections may change as buildings are built/destroyed).
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { IMPROVEMENT_MODELS } from "../../../config";
import { Building, SignalNode } from "../../../traits";
import { tileToWorld } from "./terrainRenderer";

const MODEL_BASE = "/assets/models/";
const DEFAULT_CONNECTION_RANGE = 5;
const CONNECTION_Y = 0.08;
const SEGMENT_SPACING = 1.8; // world units between pipe segments

const loader = new GLTFLoader();

let connectionGroup: THREE.Group | null = null;

function tileHash(x: number, z: number, layer: number): number {
	let h = 2166136261;
	h ^= x;
	h = Math.imul(h, 16777619);
	h ^= z;
	h = Math.imul(h, 16777619);
	h ^= layer;
	h = Math.imul(h, 16777619);
	return (h >>> 0) / 4294967296;
}

interface BuildingNode {
	readonly tileX: number;
	readonly tileZ: number;
	readonly range: number;
	readonly factionId: string;
}

/**
 * Create the infrastructure connection renderer.
 * Call once during WorldScene.create().
 */
export function createInfraConnectionRenderer(scene: THREE.Scene): void {
	connectionGroup = new THREE.Group();
	connectionGroup.name = "infra-connections";
	scene.add(connectionGroup);
}

/**
 * Rebuild infrastructure connections from the current ECS state.
 * Call once per turn or when buildings change.
 */
export function updateInfraConnections(world: World): void {
	if (!connectionGroup) return;

	while (connectionGroup.children.length > 0) {
		const child = connectionGroup.children[0];
		connectionGroup.remove(child);
	}

	const buildings: BuildingNode[] = [];
	for (const entity of world.query(Building)) {
		const b = entity.get(Building);
		if (!b) continue;

		let range = DEFAULT_CONNECTION_RANGE;
		if (entity.has(SignalNode)) {
			const sn = entity.get(SignalNode);
			if (sn && sn.range > 0) range = sn.range;
		}

		buildings.push({
			tileX: b.tileX,
			tileZ: b.tileZ,
			range,
			factionId: b.factionId,
		});
	}

	// Track unique pairs to avoid duplicate connections
	const connected = new Set<string>();

	for (let i = 0; i < buildings.length; i++) {
		const a = buildings[i];
		for (let j = i + 1; j < buildings.length; j++) {
			const b = buildings[j];
			if (a.factionId !== b.factionId) continue;

			const dx = a.tileX - b.tileX;
			const dz = a.tileZ - b.tileZ;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > Math.min(a.range, b.range)) continue;

			const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
			if (connected.has(pairKey)) continue;
			connected.add(pairKey);

			placeConnectionModels(connectionGroup, a, b);
		}
	}
}

function placeConnectionModels(
	group: THREE.Group,
	a: BuildingNode,
	b: BuildingNode,
): void {
	const posA = tileToWorld(a.tileX, a.tileZ);
	const posB = tileToWorld(b.tileX, b.tileZ);

	const dx = posB.x - posA.x;
	const dz = posB.z - posA.z;
	const length = Math.sqrt(dx * dx + dz * dz);
	if (length < 0.1) return;

	const angle = Math.atan2(dx, dz);
	const segments = Math.max(1, Math.floor(length / SEGMENT_SPACING));

	// Alternate between pipeline and power line models
	const modelList =
		tileHash(a.tileX, a.tileZ, 300) > 0.5
			? IMPROVEMENT_MODELS.pipeline
			: IMPROVEMENT_MODELS.power_line;

	for (let s = 1; s < segments; s++) {
		const t = s / segments;
		const px = posA.x + dx * t;
		const pz = posA.z + dz * t;

		const modelIdx = Math.floor(
			tileHash(a.tileX + s, a.tileZ + s, 310) * modelList.length,
		);
		const url = MODEL_BASE + modelList[modelIdx];

		loader.load(
			url,
			(gltf) => {
				const model = gltf.scene;
				model.position.set(px, CONNECTION_Y, pz);
				model.rotation.y = angle;
				model.scale.setScalar(0.35);
				model.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
				group.add(model);
			},
			undefined,
			() => {},
		);
	}
}

/**
 * Dispose the connection group. Call on scene shutdown.
 */
export function destroyInfraConnections(): void {
	if (connectionGroup) {
		while (connectionGroup.children.length > 0) {
			const child = connectionGroup.children[0];
			connectionGroup.remove(child);
		}
		connectionGroup.parent?.remove(connectionGroup);
		connectionGroup = null;
	}
}
