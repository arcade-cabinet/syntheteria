/**
 * MinimapPanel — 2D DOM minimap overlay for the in-game HUD.
 *
 * Renders terrain, territory borders, units, buildings, and deposits.
 * Territory borders use faction accent colors from config/factionVisuals.json.
 * Fog of war masks unrevealed areas in dark gray.
 *
 * Architecture:
 *   - Mounts as a DOM div positioned in the bottom-right HUD corner
 *   - Uses an HTML <canvas> element drawn via requestAnimationFrame
 *   - generateMinimapData() is called at a throttled rate (every 150ms)
 *     to avoid per-frame pixel generation overhead
 *   - Player position indicator rendered as a white crosshair
 *
 * Pure utility functions (pixelTypeToColor, getFactionMinimapColor,
 * worldToMinimap) are exported for unit tests.
 */

import { useEffect, useRef, useState } from "react";
import { config } from "../../config";
import {
	type MinimapPixel,
	generateMinimapData,
	getMinimapStats,
} from "../systems/minimapData";
import { hud, FONT_MONO } from "./designTokens";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimap canvas size in CSS pixels. */
const MINIMAP_SIZE = 160;

/** How often to regenerate minimap pixel data (ms). */
const REFRESH_INTERVAL_MS = 150;

/** Pixel type colors (static mapping). */
const PIXEL_COLORS: Record<string, string> = {
	terrain: "#2a3c2a",
	water: "#1a2a44",
	fog: "#0a0c0a",
	hazard: "#ff6600",
	deposit: "#886644",
	building: "#44aacc",
	player_unit: "#ffffff",
	enemy_unit: "#ff4444",
	ally_unit: "#44ff88",
	territory_border: "#888888", // overridden per faction below
};

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Return the CSS color string for a minimap pixel.
 * Territory borders use faction accent colors when a faction is specified.
 *
 * @param pixel - Minimap pixel from generateMinimapData()
 * @param factionColors - Map of faction → hex color string
 * @returns CSS color string
 */
export function pixelTypeToColor(
	pixel: MinimapPixel,
	factionColors: Record<string, string>,
): string {
	if (pixel.type === "territory_border" && pixel.faction) {
		return factionColors[pixel.faction] ?? PIXEL_COLORS.territory_border;
	}
	return PIXEL_COLORS[pixel.type] ?? "#333333";
}

/**
 * Get the minimap accent color for a faction from config.
 * Returns a CSS hex string (e.g. "#DAA520").
 * Falls back to amber when faction is unknown.
 *
 * @param faction - Faction key (e.g. "reclaimers")
 * @returns CSS hex color string
 */
export function getFactionMinimapColor(faction: string): string {
	const visuals = config.factionVisuals as Record<string, { accentColor?: string }>;
	return visuals[faction]?.accentColor ?? "#ffaa00";
}

/**
 * Convert a world position to minimap canvas pixel coordinates.
 *
 * @param worldX - World X coordinate
 * @param worldZ - World Z coordinate
 * @param worldSize - Total world size (world units)
 * @param canvasSize - Minimap canvas size (CSS pixels)
 * @returns { px, py } pixel coordinates (may be outside canvas bounds)
 */
export function worldToMinimap(
	worldX: number,
	worldZ: number,
	worldSize: number,
	canvasSize: number,
): { px: number; py: number } {
	return {
		px: Math.floor((worldX / worldSize) * canvasSize),
		py: Math.floor((worldZ / worldSize) * canvasSize),
	};
}

/**
 * Apply brightness/intensity to a hex color string.
 * Returns a new CSS color with brightness applied in range [0,1].
 *
 * @param hexColor - CSS hex color (e.g. "#2a3c2a")
 * @param intensity - Brightness multiplier (0-1)
 * @returns CSS rgb() color string
 */
export function applyIntensity(hexColor: string, intensity: number): string {
	const clean = hexColor.replace("#", "");
	const r = parseInt(clean.slice(0, 2), 16);
	const g = parseInt(clean.slice(2, 4), 16);
	const b = parseInt(clean.slice(4, 6), 16);
	const k = Math.max(0, Math.min(1, intensity));
	return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}

// ---------------------------------------------------------------------------
// Faction color lookup (built once per render cycle)
// ---------------------------------------------------------------------------

const KNOWN_FACTIONS = ["reclaimers", "volt_collective", "signal_choir", "iron_creed", "player"];

function buildFactionColorMap(): Record<string, string> {
	const map: Record<string, string> = {};
	for (const faction of KNOWN_FACTIONS) {
		map[faction] = getFactionMinimapColor(faction);
	}
	return map;
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

/**
 * Draw the minimap pixel grid onto a 2D canvas context.
 * Uses putImageData for a single batch write (much faster than per-pixel fillRect).
 */
function drawMinimapToCanvas(
	ctx: CanvasRenderingContext2D,
	pixels: MinimapPixel[][],
	factionColors: Record<string, string>,
	canvasSize: number,
): void {
	const res = pixels.length;
	if (res === 0) return;

	const imageData = ctx.createImageData(canvasSize, canvasSize);
	const data = imageData.data;
	const scale = canvasSize / res;

	for (let pz = 0; pz < res; pz++) {
		for (let px = 0; px < res; px++) {
			const pixel = pixels[pz]?.[px];
			if (!pixel) continue;

			const color = pixelTypeToColor(pixel, factionColors);
			const intensity = pixel.intensity ?? 1.0;
			const lit = applyIntensity(color, intensity);

			// Parse rgb() string
			const m = lit.match(/rgb\((\d+),(\d+),(\d+)\)/);
			if (!m) continue;
			const r = parseInt(m[1], 10);
			const g = parseInt(m[2], 10);
			const b = parseInt(m[3], 10);

			// Scale to canvas resolution — fill scale×scale block
			for (let sy = 0; sy < scale; sy++) {
				for (let sx = 0; sx < scale; sx++) {
					const cx = Math.floor(px * scale) + sx;
					const cy = Math.floor(pz * scale) + sy;
					if (cx >= canvasSize || cy >= canvasSize) continue;
					const idx = (cy * canvasSize + cx) * 4;
					data[idx] = r;
					data[idx + 1] = g;
					data[idx + 2] = b;
					data[idx + 3] = 255;
				}
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw the player indicator dot (white, 3px radius) at the given canvas coords.
 */
function drawPlayerIndicator(
	ctx: CanvasRenderingContext2D,
	px: number,
	py: number,
): void {
	if (px < 0 || py < 0) return;
	ctx.save();
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "#ffffff";
	ctx.shadowBlur = 4;
	ctx.beginPath();
	ctx.arc(px, py, 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

// ---------------------------------------------------------------------------
// MinimapPanel component
// ---------------------------------------------------------------------------

interface MinimapPanelProps {
	/** Player world position for the indicator dot. */
	playerX?: number;
	playerZ?: number;
	/** World size in units (default 200 to match mapConfig). */
	worldSize?: number;
	/** Whether to show the minimap at all (HUD visibility). */
	visible?: boolean;
	/** ARIA label for accessibility. */
	ariaLabel?: string;
}

/**
 * Renders the 2D minimap as a DOM canvas overlay.
 * Mount outside <Canvas> as part of the HUD layer.
 */
export function MinimapPanel({
	playerX = 0,
	playerZ = 0,
	worldSize = 200,
	visible = true,
	ariaLabel = "Minimap",
}: MinimapPanelProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);
	const lastRefreshRef = useRef<number>(0);
	const pixelsRef = useRef<MinimapPixel[][] | null>(null);
	const factionColorsRef = useRef<Record<string, string>>(buildFactionColorMap());
	const [stats, setStats] = useState({ revealedPercent: 0 });

	useEffect(() => {
		if (!visible) return;

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		factionColorsRef.current = buildFactionColorMap();

		const tick = (now: number) => {
			rafRef.current = requestAnimationFrame(tick);

			// Throttle pixel data generation
			if (now - lastRefreshRef.current >= REFRESH_INTERVAL_MS) {
				lastRefreshRef.current = now;
				pixelsRef.current = generateMinimapData();
				const s = getMinimapStats();
				setStats({ revealedPercent: s.revealedPercent });
			}

			if (!pixelsRef.current) return;

			drawMinimapToCanvas(ctx, pixelsRef.current, factionColorsRef.current, MINIMAP_SIZE);

			// Player indicator
			const { px, py } = worldToMinimap(playerX, playerZ, worldSize, MINIMAP_SIZE);
			drawPlayerIndicator(ctx, px, py);
		};

		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [visible, playerX, playerZ, worldSize]);

	if (!visible) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: 12,
				right: 12,
				width: MINIMAP_SIZE,
				zIndex: 80,
				fontFamily: FONT_MONO,
			}}
			role="img"
			aria-label={ariaLabel}
		>
			{/* Border frame */}
			<div
				style={{
					border: `1px solid ${hud.accentMuted}`,
					borderRadius: 2,
					overflow: "hidden",
					position: "relative",
				}}
			>
				<canvas
					ref={canvasRef}
					width={MINIMAP_SIZE}
					height={MINIMAP_SIZE}
					style={{ display: "block" }}
				/>

				{/* Corner label */}
				<div
					style={{
						position: "absolute",
						top: 2,
						left: 4,
						fontSize: 8,
						color: hud.accentDim,
						letterSpacing: 1,
						userSelect: "none",
					}}
					aria-hidden="true"
				>
					MAP
				</div>
			</div>

			{/* Fog reveal stat */}
			<div
				style={{
					fontSize: 8,
					color: hud.accentDim,
					textAlign: "right",
					marginTop: 2,
					letterSpacing: 1,
					userSelect: "none",
				}}
				aria-live="polite"
				aria-label={`${stats.revealedPercent}% explored`}
			>
				{stats.revealedPercent.toFixed(0)}% EXPLORED
			</div>
		</div>
	);
}
