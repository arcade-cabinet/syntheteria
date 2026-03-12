import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { resolveAssetUri } from "../../config/assetUri";
import type { CityModelDefinition } from "../config/types";

function fitScale(model: CityModelDefinition, targetSpan: number) {
	const span = Math.max(model.bounds.width, model.bounds.depth, 0.25);
	return (targetSpan / span) * model.defaultScale;
}

const FAMILY_COLORS: Record<CityModelDefinition["family"], number> = {
	floor: 0x7f9bb2,
	wall: 0x8fb0c4,
	door: 0x9fdde2,
	roof: 0x6f8a9c,
	prop: 0xd4b27a,
	detail: 0x7de3f0,
	column: 0xa5b4c8,
	stair: 0x9eb0bf,
	utility: 0xc88d5f,
};

function normalizeCityMaterial(
	material: THREE.Material,
	family: CityModelDefinition["family"],
) {
	if (!(material instanceof THREE.MeshStandardMaterial)) {
		return;
	}

	const baseColor = new THREE.Color(FAMILY_COLORS[family]);
	material.color = material.color.clone().lerp(baseColor, 0.35);
	material.emissive = material.emissive.clone().lerp(baseColor, 0.08);
	material.emissiveIntensity = family === "detail" || family === "door" ? 0.38 : 0.16;
	material.roughness = Math.min(material.roughness ?? 0.9, 0.86);
	material.metalness = Math.max(material.metalness ?? 0.15, 0.12);
	material.side = THREE.DoubleSide;
	material.needsUpdate = true;
}

export function CityModelMesh({
	model,
	targetSpan,
}: {
	model: CityModelDefinition;
	targetSpan: number;
}) {
	const gltf = useGLTF(resolveAssetUri(model.sourceAsset));
	const scene = Array.isArray(gltf) ? gltf[0]?.scene : gltf.scene;
	if (!scene) {
		return null;
	}
	const normalized = useMemo<THREE.Group | null>(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const center = new THREE.Vector3();
		box.getCenter(center);
		const clone = scene.clone(true) as THREE.Group;
		clone.position.set(-center.x, -box.min.y, -center.z);
		clone.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) {
				return;
			}
			child.castShadow = true;
			child.receiveShadow = true;
			if (Array.isArray(child.material)) {
				child.material = child.material.map((material) => {
					if (material instanceof THREE.MeshStandardMaterial) {
						const next = material.clone();
						normalizeCityMaterial(next, model.family);
						return next;
					}
					return material;
				});
				return;
			}
			if (child.material instanceof THREE.MeshStandardMaterial) {
				child.material = child.material.clone();
				normalizeCityMaterial(child.material, model.family);
			}
		});
		return clone;
	}, [scene]);
	if (!normalized) {
		return null;
	}
	const scale = fitScale(model, targetSpan);
	return <primitive object={normalized} scale={[scale, scale, scale]} />;
}
