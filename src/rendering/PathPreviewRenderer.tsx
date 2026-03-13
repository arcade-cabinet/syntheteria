/**
 * Path Preview Renderer
 *
 * Shows a line from the selected unit to the cursor position when
 * hovering over the world grid. The line is cyan when the path is
 * affordable, amber when partially affordable, red when too costly.
 *
 * Creates a THREE.Line imperatively and updates it each frame.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Identity, MapFragment, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { previewClickToMove } from "../systems/clickToMove";
import { gridToWorld } from "../world/sectorCoordinates";
import { getStructuralFragment } from "../world/structuralSpace";

const COLOR_AFFORDABLE = new THREE.Color(0x00e5ff);
const COLOR_UNAFFORDABLE = new THREE.Color(0xff4444);
const COLOR_PARTIAL = new THREE.Color(0xf6c56a);
const MAX_PATH_POINTS = 128;
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const PATH_Y = 0.15;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function PathPreviewRenderer() {
	const groupRef = useRef<THREE.Group>(null);
	const { camera, gl } = useThree();

	const { lineObj, geometry, material } = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(MAX_PATH_POINTS * 3);
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geo.setDrawRange(0, 0);

		const mat = new THREE.LineBasicMaterial({
			color: COLOR_AFFORDABLE,
			transparent: true,
			opacity: 0.8,
			depthWrite: false,
		});

		const line = new THREE.Line(geo, mat);
		line.visible = false;
		line.frustumCulled = false;

		return { lineObj: line, geometry: geo, material: mat };
	}, []);

	useEffect(() => {
		const group = groupRef.current;
		if (!group) return;
		group.add(lineObj);
		return () => {
			group.remove(lineObj);
			geometry.dispose();
			material.dispose();
		};
	}, [lineObj, geometry, material]);

	useFrame(() => {
		// Find selected player unit
		let selectedEntity = null;
		for (const entity of units) {
			const unit = entity.get(Unit);
			if (!unit?.selected) continue;
			const identity = entity.get(Identity);
			if (!identity || identity.faction !== "player") continue;
			selectedEntity = entity;
			break;
		}

		if (!selectedEntity) {
			lineObj.visible = false;
			return;
		}

		// Get current mouse position in world space
		const rect = gl.domElement.getBoundingClientRect();
		const mouseEvent = (gl.domElement as any).__lastMouseEvent as
			| { clientX: number; clientY: number }
			| undefined;

		if (!mouseEvent) {
			lineObj.visible = false;
			return;
		}

		pointer.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
		pointer.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);
		const intersection = new THREE.Vector3();
		const hit = raycaster.ray.intersectPlane(GROUND_PLANE, intersection);

		if (!hit) {
			lineObj.visible = false;
			return;
		}

		// Get preview path
		const preview = previewClickToMove(intersection.x, intersection.z);
		if (preview.path.length === 0) {
			lineObj.visible = false;
			return;
		}

		// Build line points: unit position -> each path cell
		const frag = selectedEntity.has(MapFragment)
			? getStructuralFragment(selectedEntity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		const unitPos = selectedEntity.get(WorldPosition)!;
		const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
		const positions = posAttr.array as Float32Array;

		// Start from unit position
		positions[0] = unitPos.x + ox;
		positions[1] = PATH_Y;
		positions[2] = unitPos.z + oz;

		let pointCount = 1;
		const pathLimit = Math.min(preview.path.length, MAX_PATH_POINTS - 1);

		for (let i = 0; i < pathLimit; i++) {
			const cell = preview.path[i];
			const worldPos = gridToWorld(cell.q, cell.r);
			positions[pointCount * 3] = worldPos.x + ox;
			positions[pointCount * 3 + 1] = PATH_Y;
			positions[pointCount * 3 + 2] = worldPos.z + oz;
			pointCount++;
		}

		posAttr.needsUpdate = true;
		geometry.setDrawRange(0, pointCount);

		// Update color based on affordability
		if (preview.affordable) {
			material.color.copy(COLOR_AFFORDABLE);
		} else if (preview.affordableSteps > 0) {
			material.color.copy(COLOR_PARTIAL);
		} else {
			material.color.copy(COLOR_UNAFFORDABLE);
		}

		lineObj.visible = pointCount > 1;
	});

	return <group ref={groupRef} />;
}
