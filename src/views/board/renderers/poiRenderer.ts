/**
 * POI renderer — places 3D markers at POI locations on the game board.
 *
 * Undiscovered POIs show as a generic "?" marker (glowing sphere).
 * Discovered POIs show their specific model from RUIN_POI_MODELS
 * or exploration collectibles for holocrons.
 *
 * NO React — pure Three.js. Follows salvageRenderer pattern.
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { isHolocronPOI, RUIN_POI_MODELS } from "../../../config";
import { POIMarker } from "../../../traits";
import { tileToWorld } from "./terrainRenderer";

const MODEL_BASE = "/assets/models/";
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

let parentScene: THREE.Scene | null = null;
let poiGroup: THREE.Group | null = null;

const placedMarkers = new Map<string, THREE.Object3D>();

function loadModel(url: string): Promise<THREE.Group> {
	const cached = modelCache.get(url);
	if (cached) return Promise.resolve(cached);

	return new Promise<THREE.Group>((resolve, reject) => {
		gltfLoader.load(
			url,
			(gltf) => {
				modelCache.set(url, gltf.scene);
				resolve(gltf.scene);
			},
			undefined,
			reject,
		);
	});
}

function createUndiscoveredMarker(): THREE.Group {
	const group = new THREE.Group();

	const sphere = new THREE.Mesh(
		new THREE.SphereGeometry(0.4, 16, 16),
		new THREE.MeshStandardMaterial({
			color: 0x8888ff,
			emissive: 0x4444aa,
			emissiveIntensity: 0.6,
			transparent: true,
			opacity: 0.8,
		}),
	);
	sphere.position.y = 1.2;
	group.add(sphere);

	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.6, 0.05, 8, 24),
		new THREE.MeshStandardMaterial({
			color: 0xaaaaff,
			emissive: 0x6666cc,
			emissiveIntensity: 0.4,
		}),
	);
	ring.rotation.x = Math.PI / 2;
	ring.position.y = 0.3;
	group.add(ring);

	return group;
}

function createDiscoveredHolocronMarker(): THREE.Group {
	const group = new THREE.Group();

	const crystal = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.35, 0),
		new THREE.MeshStandardMaterial({
			color: 0x00ffaa,
			emissive: 0x00aa66,
			emissiveIntensity: 0.8,
			transparent: true,
			opacity: 0.9,
		}),
	);
	crystal.position.y = 1.0;
	group.add(crystal);

	return group;
}

export function createPOIRenderer(scene: THREE.Scene, world: World): void {
	parentScene = scene;
	poiGroup = new THREE.Group();
	poiGroup.name = "poi_markers";
	scene.add(poiGroup);

	updatePOIs(world);
}

export function updatePOIs(world: World): void {
	if (!poiGroup || !parentScene) return;

	for (const entity of world.query(POIMarker)) {
		const marker = entity.get(POIMarker);
		if (!marker) continue;

		const key = `${marker.tileX},${marker.tileZ}`;
		const existing = placedMarkers.get(key);

		if (marker.discovered && marker.cleared) {
			if (existing) {
				poiGroup.remove(existing);
				placedMarkers.delete(key);
			}
			continue;
		}

		if (existing) continue;

		const worldPos = tileToWorld(marker.tileX, marker.tileZ);

		if (!marker.discovered) {
			const undiscovered = createUndiscoveredMarker();
			undiscovered.position.set(worldPos.x, worldPos.y, worldPos.z);
			poiGroup.add(undiscovered);
			placedMarkers.set(key, undiscovered);
		} else {
			const isHolo = isHolocronPOI(
				marker.poiType as import("../../../config").POIType,
			);
			if (isHolo) {
				const holoMarker = createDiscoveredHolocronMarker();
				holoMarker.position.set(worldPos.x, worldPos.y, worldPos.z);
				poiGroup.add(holoMarker);
				placedMarkers.set(key, holoMarker);
			} else {
				const ruinModels =
					RUIN_POI_MODELS[marker.poiType as keyof typeof RUIN_POI_MODELS];
				if (ruinModels && ruinModels.length > 0) {
					const modelRel = ruinModels[0];
					const url = MODEL_BASE + modelRel;
					loadModel(url)
						.then((original) => {
							if (!poiGroup) return;
							const clone = original.clone();
							clone.position.set(worldPos.x, worldPos.y, worldPos.z);
							clone.scale.setScalar(0.6);
							poiGroup.add(clone);
							placedMarkers.set(key, clone);
						})
						.catch(() => {
							if (!poiGroup) return;
							const fallback = createDiscoveredHolocronMarker();
							fallback.position.set(worldPos.x, worldPos.y, worldPos.z);
							poiGroup.add(fallback);
							placedMarkers.set(key, fallback);
						});
				}
			}
		}
	}
}

export function destroyPOIRenderer(): void {
	if (parentScene && poiGroup) {
		parentScene.remove(poiGroup);
	}
	placedMarkers.clear();
	poiGroup = null;
	parentScene = null;
}
