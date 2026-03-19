/**
 * HoverTracker — raycasts pointer position each frame and updates hoverState.
 *
 * Mounted inside the R3F Canvas. Reads ECS world to find what's under the cursor.
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createGridApi } from "../../board";
import type { GeneratedBoard } from "../../board";
import { BUILDING_DEFS } from "../../buildings";
import { SALVAGE_DEFS } from "../../resources";
import { computeTerritory } from "../../systems";
import { FLOOR_DEFS, type FloorType } from "../../terrain";
import {
	Building,
	Powered,
	ResourceDeposit,
	SalvageProp,
	Tile,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits";
import {
	clearHoverState,
	type HoverBuildingInfo,
	type HoverTileInfo,
	type HoverUnitInfo,
	setHoverState,
} from "./hoverState";

type HoverTrackerProps = {
	world: World;
	board: GeneratedBoard;
};

export function HoverTracker({ world, board }: HoverTrackerProps) {
	const { camera, gl } = useThree();
	const gridApi = useMemo(() => createGridApi(board), [board]);

	const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
	const raycaster = useRef(new THREE.Raycaster());
	const hitPoint = useRef(new THREE.Vector3());
	const pointerRef = useRef({ x: 0, y: 0 });
	const screenRef = useRef({ x: 0, y: 0 });
	const lastTileKey = useRef("");

	useEffect(() => {
		const canvas = gl.domElement;
		const onMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			screenRef.current.x = e.clientX;
			screenRef.current.y = e.clientY;
		};
		const onLeave = () => {
			lastTileKey.current = "";
			clearHoverState();
		};
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerleave", onLeave);
		return () => {
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerleave", onLeave);
		};
	}, [gl]);

	useFrame(() => {
		raycaster.current.setFromCamera(
			pointerRef.current as THREE.Vector2,
			camera,
		);
		const hit = raycaster.current.ray.intersectPlane(
			groundPlane.current,
			hitPoint.current,
		);
		if (!hit) {
			if (lastTileKey.current !== "") {
				lastTileKey.current = "";
				clearHoverState();
			}
			return;
		}

		const tile = gridApi.worldToTile(hitPoint.current.x, hitPoint.current.z);
		if (!tile) {
			if (lastTileKey.current !== "") {
				lastTileKey.current = "";
				clearHoverState();
			}
			return;
		}

		const key = `${tile.x},${tile.z}`;
		if (key === lastTileKey.current) return;
		lastTileKey.current = key;

		// Look up tile data from board
		const tileRow = board.tiles[tile.z];
		if (!tileRow) {
			clearHoverState();
			return;
		}
		const tileData = tileRow[tile.x];
		if (!tileData) {
			clearHoverState();
			return;
		}

		const floorDef = FLOOR_DEFS[tileData.floorType as FloorType];
		const tileInfo: HoverTileInfo = {
			tileX: tile.x,
			tileZ: tile.z,
			terrain: floorDef?.label ?? tileData.floorType,
			passable:
				tileData.floorType !== "void_pit" &&
				tileData.floorType !== "structural_mass",
			elevation: tileData.elevation,
		};

		// Check territory control
		const { width, height } = board.config;
		const territory = computeTerritory(world, width, height);
		const tileTerritory = territory.tiles.get(key);
		if (tileTerritory && !tileTerritory.contested) {
			tileInfo.controllingFaction = tileTerritory.factionId;
		}

		// Check for resource deposit
		for (const e of world.query(ResourceDeposit)) {
			const dep = e.get(ResourceDeposit);
			if (
				dep &&
				!dep.depleted &&
				dep.tileX === tile.x &&
				dep.tileZ === tile.z
			) {
				tileInfo.resource = { material: dep.material, amount: dep.amount };
				break;
			}
		}

		// Check for unit
		let unitInfo: HoverUnitInfo | null = null;
		for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
			const pos = e.get(UnitPos);
			const faction = e.get(UnitFaction);
			const stats = e.get(UnitStats);
			if (
				pos &&
				faction &&
				stats &&
				pos.tileX === tile.x &&
				pos.tileZ === tile.z
			) {
				const visual = e.get(UnitVisual);
				unitInfo = {
					name: visual?.modelId ?? "Unit",
					factionId: faction.factionId,
					hp: stats.hp,
					maxHp: stats.maxHp,
					ap: stats.ap,
					maxAp: stats.maxAp,
					attack: stats.attack,
					defense: stats.defense,
					weightClass: stats.weightClass,
				};
				break;
			}
		}

		// Check for building
		let buildingInfo: HoverBuildingInfo | null = null;
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.tileX === tile.x && b.tileZ === tile.z) {
				const def = BUILDING_DEFS[b.buildingType];
				buildingInfo = {
					displayName: def?.displayName ?? b.buildingType,
					factionId: b.factionId,
					hp: b.hp,
					maxHp: b.maxHp,
					powered: e.has(Powered),
				};
				break;
			}
		}

		setHoverState({
			tile: tileInfo,
			unit: unitInfo,
			building: buildingInfo,
			screenX: screenRef.current.x,
			screenY: screenRef.current.y,
		});
	});

	return null;
}
