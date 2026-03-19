/**
 * UnitStatusBars — world-space HP and AP bars floating above each unit.
 *
 * Renders billboard status indicators in the R3F scene:
 *   Bar 1 (HP): Segmented bar in MINT (#7ee7cb), restrained red at low HP.
 *   Bar 2 (AP/MP): Segmented AMBER (#f0b83f) bar — specialist resource.
 *
 * Follows GAME_DESIGN.md Section 9 diegetic palette:
 *   - Mint (#7ee7cb) — health, stable ownership, active readiness
 *   - Amber (#f0b83f) — fabrication, power, utility
 *   - Restrained red (#d94545) — failure, danger, hostile pressure (HP <25%)
 *   - Cyan (#00ccff) — selection glow (handled by ReadinessRing, not bars)
 *
 * Visibility rules:
 *   - Full HP + full AP → hidden (reduce noise), unless unit is selected
 *   - Damaged → HP bar visible
 *   - AP < maxAP → AP bar visible
 *   - Selected unit → always show both bars
 *   - Enemy units → fog-of-war gated (handled by snapshot filter)
 *   - Distance fade → bars fade out beyond 18 tiles from camera
 *
 * Uses drei <Html> for crisp, CSS-styled segmented bars that billboard
 * toward the camera automatically.
 */

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useRef, useState } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import {
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../traits/unit";
import { FACTION_COLORS } from "./modelPaths";
import { isUnitDetected } from "./unitDetection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Height offset above unit position (world units). */
const BAR_Y_OFFSET = 2.2;
/** Distance in tiles beyond which bars fade out. */
const FADE_START_TILES = 12;
const FADE_END_TILES = 18;

// ---------------------------------------------------------------------------
// Diegetic palette (GAME_DESIGN.md Section 9)
// ---------------------------------------------------------------------------

/** Mint — health, stable ownership, active readiness. */
const DIEGETIC_MINT = "#7ee7cb";
/** Amber — fabrication, power, utility (AP/MP bars). */
const DIEGETIC_AMBER = "#f0b83f";
/** Restrained red — failure, danger, hostile pressure. */
const DIEGETIC_RED = "#d94545";

function hpColor(pct: number): string {
	if (pct > 0.25) return DIEGETIC_MINT;
	return DIEGETIC_RED;
}

function factionHex(factionId: string): string {
	const num = FACTION_COLORS[factionId] ?? 0x888888;
	return `#${num.toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Segmented bar component (pure CSS)
// ---------------------------------------------------------------------------

function SegmentedBar({
	current,
	max,
	color,
	emptyColor = "rgba(30,35,45,0.6)",
	width = 40,
}: {
	current: number;
	max: number;
	color: string;
	emptyColor?: string;
	width?: number;
}) {
	if (max <= 0) return null;
	const segWidth = Math.max(2, Math.floor((width - (max - 1)) / max));

	return (
		<div style={{ display: "flex", gap: 1 }}>
			{Array.from({ length: max }).map((_, i) => (
				<div
					key={i}
					style={{
						width: segWidth,
						height: 3,
						backgroundColor: i < current ? color : emptyColor,
						borderRadius: 0.5,
					}}
				/>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Single unit status overlay
// ---------------------------------------------------------------------------

interface UnitBarData {
	eid: number;
	worldX: number;
	worldZ: number;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
	factionId: string;
	modelId: string;
	isSelected: boolean;
}

function UnitStatusOverlay({ data }: { data: UnitBarData }) {
	const hpPct = data.maxHp > 0 ? data.hp / data.maxHp : 1;
	const isDamaged = data.hp < data.maxHp;
	const hasSpentAp = data.ap < data.maxAp;
	const showBars = isDamaged || hasSpentAp || data.isSelected;

	if (!showBars) return null;

	const barColor = hpColor(hpPct);

	// AP/MP bar: amber for all units (diegetic palette — utility/power)
	const apColor = DIEGETIC_AMBER;

	return (
		<Html
			position={[data.worldX, BAR_Y_OFFSET, data.worldZ]}
			center
			sprite
			style={{
				pointerEvents: "none",
				userSelect: "none",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 1,
				}}
			>
				{/* HP bar — always show when damaged or selected */}
				{(isDamaged || data.isSelected) && (
					<SegmentedBar current={data.hp} max={data.maxHp} color={barColor} />
				)}
				{/* AP bar — show when AP spent or selected */}
				{(hasSpentAp || data.isSelected) && data.maxAp > 0 && (
					<SegmentedBar
						current={data.ap}
						max={data.maxAp}
						color={apColor}
						width={32}
					/>
				)}
			</div>
		</Html>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type UnitStatusBarsProps = {
	world: World;
	selectedUnitId?: number | null;
};

export function UnitStatusBars({ world, selectedUnitId }: UnitStatusBarsProps) {
	const [units, setUnits] = useState<UnitBarData[]>([]);
	const lastUpdate = useRef(0);
	const { camera } = useThree();

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastUpdate.current < 0.25) return;
		lastUpdate.current = now;

		// Collect player scanners for unit detection
		const playerScanners: Array<{ x: number; z: number; range: number }> = [];
		for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
			const f = e.get(UnitFaction);
			if (!f || (f.factionId !== "player" && f.factionId !== "")) continue;
			const p = e.get(UnitPos);
			const s = e.get(UnitStats);
			if (!p || !s) continue;
			playerScanners.push({ x: p.tileX, z: p.tileZ, range: s.scanRange });
		}

		const camPos = camera.position;
		const result: UnitBarData[] = [];

		for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
			const pos = entity.get(UnitPos);
			const faction = entity.get(UnitFaction);
			const stats = entity.get(UnitStats);
			if (!pos || !faction || !stats) continue;

			// Scan range gate — hide enemy unit bars when not detected
			if (
				faction.factionId !== "player" &&
				faction.factionId !== "" &&
				!isUnitDetected(pos.tileX, pos.tileZ, playerScanners)
			)
				continue;

			// Interpolated position during movement
			let wx = pos.tileX * TILE_SIZE_M;
			let wz = pos.tileZ * TILE_SIZE_M;
			if (entity.has(UnitMove)) {
				const move = entity.get(UnitMove);
				if (move) {
					const t = move.progress;
					wx = (move.fromX + (move.toX - move.fromX) * t) * TILE_SIZE_M;
					wz = (move.fromZ + (move.toZ - move.fromZ) * t) * TILE_SIZE_M;
				}
			}

			// Distance fade — skip units too far from camera
			const dx = wx - camPos.x;
			const dz = wz - camPos.z;
			const distTiles = Math.sqrt(dx * dx + dz * dz) / TILE_SIZE_M;
			if (distTiles > FADE_END_TILES) continue;

			const visual = entity.get(UnitVisual);

			result.push({
				eid: entity.id(),
				worldX: wx,
				worldZ: wz,
				hp: stats.hp,
				maxHp: stats.maxHp,
				ap: stats.ap,
				maxAp: stats.maxAp,
				factionId: faction.factionId,
				modelId: visual?.modelId ?? "",
				isSelected: entity.id() === selectedUnitId,
			});
		}

		setUnits(result);
	});

	return (
		<>
			{units.map((u) => (
				<UnitStatusOverlay key={u.eid} data={u} />
			))}
		</>
	);
}
