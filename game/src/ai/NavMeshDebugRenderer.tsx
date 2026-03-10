/**
 * NavMeshDebugRenderer — R3F component that visualizes the Yuka NavMesh.
 *
 * Toggle with the backtick/tilde key (`` ` ``). When visible it shows:
 *   - Navmesh regions as a green wireframe overlay
 *   - Active paths as colored lines (cyan)
 *   - Obstacle footprints as semi-transparent red rectangles
 *
 * Performance: geometry is rebuilt only when the navmesh changes (detected
 * by comparing the region count). Paths update each frame since they change
 * as entities move.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { NavMesh } from "yuka";

import { getCityBuildings } from "../ecs/cityLayout";
import { getTerrainHeight } from "../ecs/terrain";
import { movingUnits } from "../ecs/world";
import { YukaManager } from "./YukaManager";

// ---------------------------------------------------------------------------
// Toggle key
// ---------------------------------------------------------------------------

const DEBUG_KEY = "`";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NavMeshDebugRenderer() {
	const [visible, setVisible] = useState(false);
	const meshRef = useRef<THREE.LineSegments>(null);
	const pathLinesRef = useRef<THREE.LineSegments>(null);
	const obstaclesMeshRef = useRef<THREE.Mesh>(null);

	// Toggle visibility with backtick key
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === DEBUG_KEY) {
				setVisible((v) => !v);
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Track navmesh version to detect changes
	const lastRegionCountRef = useRef(0);

	// Build navmesh wireframe geometry
	const navMeshGeometry = useMemo(() => {
		if (!visible) return null;

		const navMesh: NavMesh | null = YukaManager.navMesh;
		if (!navMesh || navMesh.regions.length === 0) return null;

		lastRegionCountRef.current = navMesh.regions.length;

		const positions: number[] = [];

		for (const region of navMesh.regions) {
			let edge = region.edge;
			if (!edge) continue;

			// Walk the half-edge loop and emit line segments
			const firstEdge = edge;
			do {
				const a = edge.vertex;
				const b = edge.next.vertex;

				// Lift slightly above terrain to avoid z-fighting
				positions.push(a.x, a.y + 0.15, a.z);
				positions.push(b.x, b.y + 0.15, b.z);

				edge = edge.next;
			} while (edge !== firstEdge);
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		return geo;
	}, [visible]);

	// Build obstacle visualization geometry
	const obstacleGeometry = useMemo(() => {
		if (!visible) return null;

		const buildings = getCityBuildings();
		if (buildings.length === 0) return null;

		const geo = new THREE.BufferGeometry();
		const positions: number[] = [];
		const indices: number[] = [];
		let vertIdx = 0;

		for (const b of buildings) {
			const x0 = b.x - b.halfW;
			const x1 = b.x + b.halfW;
			const z0 = b.z - b.halfD;
			const z1 = b.z + b.halfD;
			const y = getTerrainHeight(b.x, b.z) + 0.1;

			positions.push(x0, y, z0);
			positions.push(x1, y, z0);
			positions.push(x1, y, z1);
			positions.push(x0, y, z1);

			// Two triangles for the quad
			indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
			indices.push(vertIdx, vertIdx + 2, vertIdx + 3);
			vertIdx += 4;
		}

		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setIndex(indices);
		return geo;
	}, [visible]);

	// Update path lines each frame (paths change as entities move)
	useFrame(() => {
		if (!visible || !pathLinesRef.current) return;

		const positions: number[] = [];

		for (const entity of movingUnits) {
			const nav = entity.navigation;
			if (!nav.moving || nav.path.length < 2) continue;

			// Draw the remaining path from current index
			for (let i = Math.max(0, nav.pathIndex); i < nav.path.length - 1; i++) {
				const a = nav.path[i];
				const b = nav.path[i + 1];
				positions.push(a.x, a.y + 0.3, a.z);
				positions.push(b.x, b.y + 0.3, b.z);
			}
		}

		const geo = pathLinesRef.current.geometry as THREE.BufferGeometry;
		if (positions.length > 0) {
			geo.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(positions, 3),
			);
			geo.attributes.position.needsUpdate = true;
		} else {
			// Clear geometry if no paths
			geo.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
		}
		geo.computeBoundingSphere();
	});

	// Check if navmesh changed and we need to rebuild geometry
	useFrame(() => {
		if (!visible) return;
		const navMesh = YukaManager.navMesh;
		if (!navMesh) return;

		if (navMesh.regions.length !== lastRegionCountRef.current) {
			// NavMesh was rebuilt — force re-render by toggling visibility
			setVisible(false);
			requestAnimationFrame(() => setVisible(true));
		}
	});

	if (!visible) return null;

	return (
		<group name="navmesh-debug">
			{/* NavMesh wireframe */}
			{navMeshGeometry && (
				<lineSegments ref={meshRef} geometry={navMeshGeometry}>
					<lineBasicMaterial
						color={0x00ff44}
						transparent
						opacity={0.4}
						depthTest={false}
					/>
				</lineSegments>
			)}

			{/* Active path lines */}
			<lineSegments ref={pathLinesRef}>
				<bufferGeometry />
				<lineBasicMaterial
					color={0x00ffff}
					transparent
					opacity={0.8}
					depthTest={false}
					linewidth={2}
				/>
			</lineSegments>

			{/* Obstacle footprints */}
			{obstacleGeometry && (
				<mesh ref={obstaclesMeshRef} geometry={obstacleGeometry}>
					<meshBasicMaterial
						color={0xff2222}
						transparent
						opacity={0.25}
						side={THREE.DoubleSide}
						depthTest={false}
					/>
				</mesh>
			)}
		</group>
	);
}
