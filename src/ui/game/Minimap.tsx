/**
 * Minimap — 150x150px bottom-left overlay.
 *
 * Renders explored terrain as colored pixels, fog overlay for unexplored,
 * bright dots for player units, red dots for enemies.
 * Click to pan camera to that location.
 */

import type { World } from "koota";
import { useCallback, useEffect, useRef } from "react";
import type { GeneratedBoard } from "../../board";
import { TILE_SIZE_M } from "../../board";
import { getCameraControls } from "../../camera";
import { FACTION_COLORS } from "../../config";
import { getRelation } from "../../factions";
import { computeTerritory } from "../../systems";
import { Building, Tile, UnitFaction, UnitPos } from "../../traits";

const SIZE = 150;

// Terrain colors for minimap pixels
const TERRAIN_COLORS: Record<string, [number, number, number]> = {
	water: [8, 8, 15],
	mountain: [40, 45, 55],
	wetland: [15, 20, 35],
	grassland: [60, 55, 50],
	forest: [35, 55, 28],
	desert: [55, 52, 45],
	hills: [50, 42, 35],
	tundra: [45, 48, 55],
};

const FOG_COLOR: [number, number, number] = [10, 12, 18];
const PLAYER_COLOR: [number, number, number] = [0, 200, 255];
const ALLY_COLOR: [number, number, number] = [100, 220, 160];
const ENEMY_COLOR: [number, number, number] = [255, 60, 60];
const BUILDING_COLOR: [number, number, number] = [0, 255, 120];

type MinimapProps = {
	world: World;
	board: GeneratedBoard;
};

export function Minimap({ world, board }: MinimapProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const { width, height } = board.config;
		const scaleX = SIZE / width;
		const scaleY = SIZE / height;

		// Build explored set
		const explored = new Set<string>();
		for (const e of world.query(Tile)) {
			const t = e.get(Tile);
			if (t?.explored) explored.add(`${t.x},${t.z}`);
		}

		// Draw terrain
		const imageData = ctx.createImageData(SIZE, SIZE);
		const data = imageData.data;

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const tile = board.tiles[z]?.[x];
				if (!tile) continue;

				const isExplored = explored.has(`${x},${z}`);
				const color = isExplored
					? (TERRAIN_COLORS[tile.biomeType] ?? FOG_COLOR)
					: FOG_COLOR;

				// Map tile to pixel range
				const px0 = Math.floor(x * scaleX);
				const px1 = Math.floor((x + 1) * scaleX);
				const py0 = Math.floor(z * scaleY);
				const py1 = Math.floor((z + 1) * scaleY);

				for (let py = py0; py < py1; py++) {
					for (let px = px0; px < px1; px++) {
						const idx = (py * SIZE + px) * 4;
						data[idx] = color[0];
						data[idx + 1] = color[1];
						data[idx + 2] = color[2];
						data[idx + 3] = 255;
					}
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);

		// Draw territory overlay (semi-transparent faction colors)
		// Allied factions get a lighter tint to distinguish from hostiles
		const territory = computeTerritory(world, width, height);
		for (const [key, info] of territory.tiles) {
			const [tx, tz] = key.split(",").map(Number);
			if (!explored.has(key)) continue; // Only show territory in explored areas

			const factionColor = FACTION_COLORS[info.factionId];
			if (factionColor == null) continue;

			let r = (factionColor >> 16) & 0xff;
			let g = (factionColor >> 8) & 0xff;
			let b = factionColor & 0xff;

			// Lighten ally territory colors (blend toward white)
			const isAlly =
				info.factionId !== "player" &&
				getRelation(world, "player", info.factionId) === "ally";
			if (isAlly) {
				r = Math.min(255, r + Math.floor((255 - r) * 0.5));
				g = Math.min(255, g + Math.floor((255 - g) * 0.5));
				b = Math.min(255, b + Math.floor((255 - b) * 0.5));
			}

			const px0 = Math.floor(tx * scaleX);
			const px1 = Math.floor((tx + 1) * scaleX);
			const py0 = Math.floor(tz * scaleY);
			const py1 = Math.floor((tz + 1) * scaleY);

			if (info.contested) {
				// Striped pattern for contested tiles — alternating lines
				ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
				for (let py = py0; py < py1; py++) {
					if (py % 2 === 0) {
						ctx.fillRect(px0, py, px1 - px0, 1);
					}
				}
			} else {
				ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
				ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
			}
		}

		// Draw unit dots (allies get a lighter color)
		for (const e of world.query(UnitPos, UnitFaction)) {
			const pos = e.get(UnitPos);
			const faction = e.get(UnitFaction);
			if (!pos || !faction) continue;

			const px = Math.floor(pos.tileX * scaleX);
			const py = Math.floor(pos.tileZ * scaleY);
			let color: [number, number, number];
			if (faction.factionId === "player") {
				color = PLAYER_COLOR;
			} else if (getRelation(world, "player", faction.factionId) === "ally") {
				color = ALLY_COLOR;
			} else {
				color = ENEMY_COLOR;
			}

			ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
			ctx.fillRect(px - 1, py - 1, 3, 3);
		}

		// Draw building dots
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (!b) continue;

			const px = Math.floor(b.tileX * scaleX);
			const py = Math.floor(b.tileZ * scaleY);

			if (b.factionId === "player") {
				ctx.fillStyle = `rgb(${BUILDING_COLOR[0]},${BUILDING_COLOR[1]},${BUILDING_COLOR[2]})`;
				ctx.fillRect(px - 1, py - 1, 2, 2);
			}
		}
	}, [world, board]);

	// Redraw every 500ms (turn-based, no need for 60fps)
	useEffect(() => {
		draw();
		intervalRef.current = setInterval(draw, 500);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [draw]);

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const px = e.clientX - rect.left;
			const py = e.clientY - rect.top;

			const { width, height } = board.config;
			const tileX = Math.floor((px / SIZE) * width);
			const tileZ = Math.floor((py / SIZE) * height);

			const controls = getCameraControls();
			if (controls) {
				controls.panTo(tileX * TILE_SIZE_M, tileZ * TILE_SIZE_M);
			}
		},
		[board],
	);

	return (
		<canvas
			ref={canvasRef}
			width={SIZE}
			height={SIZE}
			onClick={handleClick}
			data-testid="minimap"
			style={{
				position: "absolute",
				bottom: 60,
				left: 12,
				width: SIZE,
				height: SIZE,
				border: "1px solid rgba(139, 230, 255, 0.25)",
				borderRadius: 4,
				cursor: "pointer",
				imageRendering: "pixelated",
			}}
		/>
	);
}
