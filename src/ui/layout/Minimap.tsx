/**
 * Minimap — canvas element showing chunk outlines, unit dots, and fog.
 *
 * Green dots for player units, red for enemies, cyan for buildings,
 * yellow for scavenge sites, white rectangle for camera viewport.
 * Dark slate background with fog-of-war overlay.
 */

import { useRef, useEffect, useSyncExternalStore } from "react";
import { getCityBuildings } from "../../ecs/cityLayout";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { getAllFragments, worldToFogIndex } from "../../ecs/terrain";
import {
	BuildingTrait,
	Faction,
	Position,
	ScavengeSite,
	Unit,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { getScavengePoints } from "../../systems/resources";

/** City bounds: 48 tiles * 2m = 96 world units */
const CITY_EXTENT = 96;
const MAP_SIZE = 150;
const MAP_PAD = 4;

/** Convert city world coords to minimap pixel coords */
function cityToMinimap(worldCoord: number): number {
	return MAP_PAD + (worldCoord / CITY_EXTENT) * (MAP_SIZE - MAP_PAD * 2);
}

/** Get merged fog state at a world position across all fragments (max wins) */
function getMergedFogAt(wx: number, wz: number): number {
	const idx = worldToFogIndex(wx, wz);
	if (idx < 0) return 0;
	let maxFog = 0;
	for (const frag of getAllFragments()) {
		const val = frag.fog[idx] ?? 0;
		if (val > maxFog) maxFog = val;
	}
	return maxFog;
}

export function Minimap() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		canvas.width = MAP_SIZE;
		canvas.height = MAP_SIZE;

		// Clear
		ctx.fillStyle = "#0a0e14";
		ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

		// Draw fog overlay — sample explored state on a coarse grid
		const fogStep = 3;
		for (let px = 0; px < MAP_SIZE; px += fogStep) {
			for (let py = 0; py < MAP_SIZE; py += fogStep) {
				const wx =
					((px - MAP_PAD) / (MAP_SIZE - MAP_PAD * 2)) * CITY_EXTENT;
				const wz =
					((py - MAP_PAD) / (MAP_SIZE - MAP_PAD * 2)) * CITY_EXTENT;
				const fog = getMergedFogAt(wx, wz);
				if (fog >= 2) {
					ctx.fillStyle = "rgba(0,40,30,0.6)";
				} else if (fog >= 1) {
					ctx.fillStyle = "rgba(0,20,15,0.4)";
				} else {
					continue;
				}
				ctx.fillRect(px, py, fogStep, fogStep);
			}
		}

		// Draw labyrinth walls
		ctx.fillStyle = "#333333";
		for (const bldg of getCityBuildings()) {
			const mx = cityToMinimap(bldg.x);
			const my = cityToMinimap(bldg.z);
			ctx.fillRect(mx, my, 1, 1);
		}

		// Draw scavenge sites (yellow dots — only in explored areas)
		ctx.fillStyle = "#ccaa44";
		for (const point of getScavengePoints()) {
			if (point.remaining <= 0) continue;
			if (getMergedFogAt(point.x, point.z) < 1) continue;
			const mx = cityToMinimap(point.x);
			const my = cityToMinimap(point.z);
			ctx.fillRect(mx, my, 2, 2);
		}
		for (const site of world.query(Position, ScavengeSite)) {
			const siteData = site.get(ScavengeSite)!;
			if (siteData.remaining <= 0) continue;
			const sPos = site.get(Position)!;
			if (getMergedFogAt(sPos.x, sPos.z) < 1) continue;
			const mx = cityToMinimap(sPos.x);
			const my = cityToMinimap(sPos.z);
			ctx.fillRect(mx, my, 2, 2);
		}

		// Draw player-placed buildings (cyan)
		ctx.fillStyle = "#00aaaa";
		for (const entity of world.query(BuildingTrait, Position)) {
			const pos = entity.get(Position)!;
			const mx = cityToMinimap(pos.x);
			const my = cityToMinimap(pos.z);
			ctx.fillRect(mx - 1, my - 1, 3, 3);
		}

		// Draw units
		for (const entity of world.query(Unit, Faction, Position)) {
			const faction = entity.get(Faction)!.value;
			const pos = entity.get(Position)!;
			const mx = cityToMinimap(pos.x);
			const my = cityToMinimap(pos.z);

			if (faction === "player") {
				ctx.fillStyle = "#00ff88";
				ctx.fillRect(mx - 1, my - 1, 3, 3);
			} else {
				ctx.fillStyle = "#ff3333";
				ctx.fillRect(mx - 1, my - 1, 2, 2);
			}
		}
	}, [snap.tick]);

	return (
		<div className="w-full aspect-square bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
			<canvas
				ref={canvasRef}
				className="w-full h-full"
			/>
		</div>
	);
}
