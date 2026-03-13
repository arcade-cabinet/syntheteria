import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { resolveAssetUri } from "../../config/assetUri";
import {
	applyMaterialDefinition,
	getCityFamilyMaterial,
	MATERIAL_DEFINITIONS,
} from "../../rendering/materials/MaterialFactory";
import type { CityModelDefinition } from "../config/types";

function fitScale(model: CityModelDefinition, targetSpan: number) {
	const span = Math.max(model.bounds.width, model.bounds.depth, 0.25);
	return (targetSpan / span) * model.defaultScale;
}

function normalizeCityMaterial(
	material: THREE.Material,
	family: CityModelDefinition["family"],
) {
	if (!(material instanceof THREE.MeshStandardMaterial)) {
		return;
	}

	const definition = getCityFamilyMaterial(family);
	if (definition) {
		applyMaterialDefinition(material, definition, 0.35);
	} else {
		// Fallback: use the city_wall definition as a safe default
		const fallback = MATERIAL_DEFINITIONS.city_wall;
		if (fallback) {
			applyMaterialDefinition(material, fallback, 0.35);
		}
	}
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
