/**
 * Fog of War overlay renderer.
 *
 * Renders a semi-transparent black plane over the entire map using a custom
 * shader driven by the per-faction fog DataTexture. The plane sits slightly
 * above terrain height so it composites cleanly over all ground-level content.
 *
 * Visibility states:
 *   UNEXPLORED — fully black (alpha 1.0)
 *   EXPLORED   — dark overlay (alpha from config, default 0.6)
 *   VISIBLE    — transparent (alpha 0.0)
 *
 * The fog texture is updated by the fogOfWar system each tick; this component
 * only reads it and ensures the shader uniform stays current.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { FactionId } from "../../ecs/traits/core";
import { WORLD_SIZE } from "../ecs/terrain";
import {
	EDGE_BLEND_SIZE,
	EXPLORED_DARKNESS,
	GRID_CELLS,
	getFogTexture,
} from "../systems/fogOfWar";
import {
	fogFragmentShader,
	fogVertexShader,
} from "./shaders/fogShader";

interface FogOfWarRendererProps {
	/** Which faction's fog to render. Defaults to "player". */
	factionId?: FactionId;
	/** Y height of the overlay plane above the terrain. */
	height?: number;
}

export function FogOfWarRenderer({
	factionId = "player",
	height = 0.6,
}: FogOfWarRendererProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);

	const { geometry, material } = useMemo(() => {
		const fogTexture = getFogTexture(factionId);

		const texelSize = new THREE.Vector2(
			1.0 / GRID_CELLS,
			1.0 / GRID_CELLS,
		);

		const mat = new THREE.ShaderMaterial({
			uniforms: {
				fogTexture: { value: fogTexture },
				exploredDarkness: { value: EXPLORED_DARKNESS },
				edgeBlendSize: { value: EDGE_BLEND_SIZE },
				texelSize: { value: texelSize },
			},
			vertexShader: fogVertexShader,
			fragmentShader: fogFragmentShader,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		// Plane geometry covering the entire world, facing up (XZ plane)
		const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
		// PlaneGeometry is in XY by default — rotate to XZ
		geo.rotateX(-Math.PI / 2);

		return { geometry: geo, material: mat };
	}, [factionId]);

	// Keep the fog texture uniform up to date (in case the texture object
	// is recreated, e.g. after a faction reset).
	useFrame(() => {
		if (!materialRef.current) return;
		const currentTexture = getFogTexture(factionId);
		if (materialRef.current.uniforms.fogTexture.value !== currentTexture) {
			materialRef.current.uniforms.fogTexture.value = currentTexture;
		}
	});

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	}, [geometry, material]);

	return (
		<mesh
			geometry={geometry}
			material={material}
			position={[0, height, 0]}
			renderOrder={999}
			frustumCulled={false}
		>
			<primitive object={material} ref={materialRef} attach="material" />
		</mesh>
	);
}
