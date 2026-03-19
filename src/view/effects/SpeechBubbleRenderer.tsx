/**
 * SpeechBubbleRenderer — billboard speech text above units.
 *
 * Renders faction-colored text bubbles above units that have active speech.
 * Speech is driven by the speechBubbleStore pub/sub — game systems trigger
 * speech during combat, harvest, and diplomacy events.
 *
 * Uses drei <Html> for crisp CSS text that billboards toward the camera.
 * Positioned above status bars (Y offset = 3.0 vs bars at 2.2).
 */

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { useRef, useState } from "react";
import { TILE_SIZE_M } from "../../board/grid";
import type { ActiveSpeech } from "../../systems";
import { getActiveSpeech } from "../../systems";
import { UnitFaction, UnitMove, UnitPos } from "../../traits";
import { FACTION_COLORS } from "../../rendering/modelPaths";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Height offset above unit — above the status bars. */
const SPEECH_Y_OFFSET = 3.0;

/** Max characters per line before wrapping. */
const MAX_LINE_WIDTH = 28;

// ─── Faction color helpers ──────────────────────────────────────────────────

function factionHex(factionId: string): string {
	const num = FACTION_COLORS[factionId] ?? 0x888888;
	return `#${num.toString(16).padStart(6, "0")}`;
}

// ─── Single speech bubble ───────────────────────────────────────────────────

interface BubbleData {
	entityId: number;
	worldX: number;
	worldZ: number;
	text: string;
	factionId: string;
	/** 0→1 progress through bubble lifetime, for fade-out. */
	age: number;
}

function SpeechBubble({ data }: { data: BubbleData }) {
	const color = factionHex(data.factionId);
	// Fade out in the last 30% of lifetime
	const opacity = data.age > 0.7 ? 1 - (data.age - 0.7) / 0.3 : 1;

	return (
		<Html
			position={[data.worldX, SPEECH_Y_OFFSET, data.worldZ]}
			center
			sprite
			style={{ pointerEvents: "none", userSelect: "none" }}
		>
			<div
				style={{
					maxWidth: MAX_LINE_WIDTH + "ch",
					padding: "3px 6px",
					background: "rgba(3, 3, 8, 0.75)",
					border: `1px solid ${color}40`,
					borderRadius: 3,
					color,
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 9,
					letterSpacing: "0.05em",
					textTransform: "uppercase",
					lineHeight: 1.3,
					textAlign: "center",
					opacity,
					transition: "opacity 0.3s ease",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
			>
				{data.text}
			</div>
		</Html>
	);
}

// ─── Main renderer ──────────────────────────────────────────────────────────

type SpeechBubbleRendererProps = {
	world: World;
};

export function SpeechBubbleRenderer({ world }: SpeechBubbleRendererProps) {
	const [bubbles, setBubbles] = useState<BubbleData[]>([]);
	const lastUpdate = useRef(0);

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastUpdate.current < 0.15) return;
		lastUpdate.current = now;

		const active = getActiveSpeech();
		if (active.length === 0) {
			if (bubbles.length > 0) setBubbles([]);
			return;
		}

		// Build entity position map from ECS
		const posMap = new Map<number, { x: number; z: number }>();
		for (const entity of world.query(UnitPos, UnitFaction)) {
			const pos = entity.get(UnitPos);
			if (!pos) continue;

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
			posMap.set(entity.id(), { x: wx, z: wz });
		}

		const realNow = Date.now();
		const DURATION_MS = 3000; // matches SPEECH_BUBBLE_DURATION_TURNS * 1000
		const result: BubbleData[] = [];

		for (const speech of active) {
			const pos = posMap.get(speech.entityId);
			if (!pos) continue;

			const age = Math.min(1, (realNow - speech.startedAt) / DURATION_MS);
			result.push({
				entityId: speech.entityId,
				worldX: pos.x,
				worldZ: pos.z,
				text: speech.text,
				factionId: speech.factionId,
				age,
			});
		}

		setBubbles(result);
	});

	return (
		<>
			{bubbles.map((b) => (
				<SpeechBubble key={b.entityId} data={b} />
			))}
		</>
	);
}
