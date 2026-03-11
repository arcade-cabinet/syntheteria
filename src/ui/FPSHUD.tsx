/**
 * FPS heads-up display — minimal, immersive overlay.
 *
 * Colonization framing: "Colony Status", faction-colored accents.
 * Shows: crosshair, colony unit status, resources, power, component health.
 *
 * The HUD uses a machine-vision aesthetic — scan lines, terminal accents,
 * faction-colored highlights where possible.
 */

import { memo, useCallback, useMemo, useSyncExternalStore } from "react";
import { FaithBar } from "./FaithBar";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import type { UnitComponent } from "../ecs/types";
import { buildings, getActivePlayerBot, units } from "../ecs/world";
import {
	getHoveredEntity,
} from "../input/ObjectSelectionSystem";
import { getActivePlacement } from "../systems/buildingPlacement";
import { getLastHitResult } from "../systems/fpsCombat";
import {
	formatDistance,
	getCrosshairTooltipInfo,
} from "./crosshairTooltip";

// Building/fabrication imports reserved for future build-mode HUD panels

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Player faction accent color — set at game start via setHUDFaction()
// ---------------------------------------------------------------------------

/** Default green — replaced at game start with faction color */
let _hudAccent = "#00ffaa";
const _accentListeners = new Set<() => void>();

/** Call this when the player's faction is known (at game start). */
export function setHUDFaction(factionAccentColor: string) {
	_hudAccent = factionAccentColor;
	for (const fn of _accentListeners) fn();
}

export function getHUDAccent(): string {
	return _hudAccent;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Crosshair() {
	// Re-render on game state changes (covers pause, speed, combat events)
	useSyncExternalStore(subscribe, getSnapshot);

	// Flash crosshair on hit (red miss / amber hit) for ~200ms after firing
	const hitResult = getLastHitResult();
	const age = performance.now() - hitResult.timestamp;
	const isHitFlash = age < 200;
	const accent = getHUDAccent();

	// Determine crosshair style from hovered entity
	const hovered = getHoveredEntity();
	const isBuildMode = !!getActivePlacement();
	const hoveredUnit = hovered.entityId
		? Array.from(units).find((u) => u.id === hovered.entityId)
		: null;
	const isEnemy = hoveredUnit ? hoveredUnit.faction !== "player" : false;

	const tooltipInfo = getCrosshairTooltipInfo(
		hovered.entityType,
		hoveredUnit?.unit?.displayName ?? null,
		hovered.distance > 0 ? hovered.distance : null,
		isBuildMode,
		isEnemy,
	);

	// Color logic: hit flash overrides style color
	const styleColors: Record<string, string> = {
		none: `${accent}88`,
		interact: "#00aaff",
		harvest: "#ffaa00",
		combat: "#ff4444",
		build: "#00ff88",
	};
	const baseColor = styleColors[tooltipInfo.style] ?? `${accent}88`;
	const crosshairColor = isHitFlash
		? hitResult.hit
			? "#ff4444"
			: "#ffaa00"
		: baseColor;
	const dotColor = isHitFlash
		? hitResult.hit
			? "#ff4444"
			: "#ffaa00"
		: tooltipInfo.style === "none"
			? accent
			: baseColor;

	// Shape varies by style
	const armLength = tooltipInfo.style === "combat" ? 14 : 20;
	const gap = tooltipInfo.style === "interact" || tooltipInfo.style === "build" ? 4 : 0;
	const showDot = tooltipInfo.style !== "build";
	const showCorners = tooltipInfo.style === "interact" || tooltipInfo.style === "build";

	return (
		<>
			{/* Crosshair */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					pointerEvents: "none",
				}}
			>
				{/* Horizontal arm left */}
				<div
					style={{
						width: `${armLength / 2 - gap}px`,
						height: "2px",
						background: crosshairColor,
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: `translate(calc(-100% - ${gap}px), -50%)`,
					}}
				/>
				{/* Horizontal arm right */}
				<div
					style={{
						width: `${armLength / 2 - gap}px`,
						height: "2px",
						background: crosshairColor,
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: `translate(${gap}px, -50%)`,
					}}
				/>
				{/* Vertical arm top */}
				<div
					style={{
						width: "2px",
						height: `${armLength / 2 - gap}px`,
						background: crosshairColor,
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: `translate(-50%, calc(-100% - ${gap}px))`,
					}}
				/>
				{/* Vertical arm bottom */}
				<div
					style={{
						width: "2px",
						height: `${armLength / 2 - gap}px`,
						background: crosshairColor,
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: `translate(-50%, ${gap}px)`,
					}}
				/>
				{/* Center dot */}
				{showDot && (
					<div
						style={{
							width: "3px",
							height: "3px",
							borderRadius: "50%",
							background: dotColor,
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
						}}
					/>
				)}
				{/* Corner brackets for interact/build style */}
				{showCorners && (
					<>
						{/* Top-left corner */}
						<div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-14px, -14px)" }}>
							<div style={{ width: "6px", height: "2px", background: crosshairColor, position: "absolute", top: 0, left: 0 }} />
							<div style={{ width: "2px", height: "6px", background: crosshairColor, position: "absolute", top: 0, left: 0 }} />
						</div>
						{/* Top-right corner */}
						<div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(8px, -14px)" }}>
							<div style={{ width: "6px", height: "2px", background: crosshairColor, position: "absolute", top: 0, right: 0 }} />
							<div style={{ width: "2px", height: "6px", background: crosshairColor, position: "absolute", top: 0, right: 0 }} />
						</div>
						{/* Bottom-left corner */}
						<div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-14px, 8px)" }}>
							<div style={{ width: "6px", height: "2px", background: crosshairColor, position: "absolute", bottom: 0, left: 0 }} />
							<div style={{ width: "2px", height: "6px", background: crosshairColor, position: "absolute", bottom: 0, left: 0 }} />
						</div>
						{/* Bottom-right corner */}
						<div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(8px, 8px)" }}>
							<div style={{ width: "6px", height: "2px", background: crosshairColor, position: "absolute", bottom: 0, right: 0 }} />
							<div style={{ width: "2px", height: "6px", background: crosshairColor, position: "absolute", bottom: 0, right: 0 }} />
						</div>
					</>
				)}
			</div>

			{/* Contextual tooltip — shown when hovering an entity */}
			{tooltipInfo.entityLabel && (
				<div
					aria-live="polite"
					aria-label={`Looking at: ${tooltipInfo.entityLabel}`}
					style={{
						position: "absolute",
						top: "calc(50% + 28px)",
						left: "50%",
						transform: "translateX(-50%)",
						background: "rgba(0, 8, 4, 0.82)",
						border: `1px solid ${crosshairColor}44`,
						borderRadius: "4px",
						padding: "5px 10px",
						pointerEvents: "none",
						fontFamily: MONO,
						textAlign: "center",
						whiteSpace: "nowrap",
					}}
				>
					{/* Entity label + distance */}
					<div
						style={{
							color: crosshairColor,
							fontSize: "11px",
							fontWeight: "bold",
							letterSpacing: "0.08em",
							marginBottom: tooltipInfo.actions.length > 0 ? "3px" : 0,
						}}
					>
						{tooltipInfo.entityLabel}
						{tooltipInfo.distance !== null && (
							<span style={{ color: `${crosshairColor}88`, marginLeft: "8px", fontWeight: "normal" }}>
								{formatDistance(tooltipInfo.distance)}
							</span>
						)}
					</div>
					{/* Action hints */}
					{tooltipInfo.actions.length > 0 && (
						<div
							style={{
								display: "flex",
								gap: "10px",
								justifyContent: "center",
								flexWrap: "wrap",
							}}
						>
							{tooltipInfo.actions.map((action) => (
								<span
									key={action.key}
									style={{ fontSize: "10px", color: `${crosshairColor}88`, letterSpacing: "0.05em" }}
								>
									<span
										style={{
											background: `${crosshairColor}22`,
											border: `1px solid ${crosshairColor}44`,
											borderRadius: "2px",
											padding: "0 4px",
											marginRight: "3px",
											fontSize: "9px",
										}}
									>
										{action.key}
									</span>
									{action.label}
								</span>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}

const ComponentBar = memo(function ComponentBar({ comp }: { comp: UnitComponent }) {
	const accent = getHUDAccent();
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "6px",
				fontSize: "11px",
				opacity: comp.functional ? 0.8 : 1,
			}}
		>
			<div
				style={{
					width: "6px",
					height: "6px",
					borderRadius: "50%",
					background: comp.functional ? "#00ff88" : "#ff4444",
					boxShadow: comp.functional ? "0 0 4px #00ff88" : "0 0 6px #ff4444",
				}}
			/>
			<span
				style={{
					color: comp.functional ? `${accent}88` : "#ff444488",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				{comp.name.replace(/_/g, " ")}
			</span>
			{!comp.functional && (
				<span style={{ color: "#ff4444", fontSize: "9px" }}>OFFLINE</span>
			)}
		</div>
	);
});

function BotStatus() {
	// Subscribe to state changes so we re-render when the active bot switches
	useSyncExternalStore(subscribe, getSnapshot);
	const bot = getActivePlayerBot();
	const accent = getHUDAccent();
	if (!bot) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
				left: `calc(16px + env(safe-area-inset-left, 0px))`,
				background: "rgba(0, 8, 4, 0.75)",
				border: `1px solid ${accent}33`,
				borderRadius: "6px",
				padding: "10px 14px",
				pointerEvents: "none",
				minWidth: "140px",
			}}
		>
			{/* Section label */}
			<div
				style={{
					fontSize: "9px",
					color: `${accent}55`,
					letterSpacing: "0.2em",
					marginBottom: "4px",
					textTransform: "uppercase",
				}}
			>
				Colony Unit
			</div>
			<div
				style={{
					color: accent,
					fontSize: "13px",
					fontWeight: "bold",
					marginBottom: "6px",
					letterSpacing: "0.1em",
				}}
			>
				{bot.unit.displayName}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
				{bot.unit.components.map((comp, i) => (
					<ComponentBar key={i} comp={comp} />
				))}
			</div>
		</div>
	);
}

function ResourceBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const accent = getHUDAccent();

	const stormColor =
		snap.power.stormIntensity > 1.1
			? "#ffaa00"
			: snap.power.stormIntensity > 0.8
				? accent
				: `${accent}66`;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Colony resources"
			style={{
				position: "absolute",
				top: `calc(12px + env(safe-area-inset-top, 0px))`,
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				gap: "18px",
				fontSize: "12px",
				color: `${accent}99`,
				background: "rgba(0, 8, 4, 0.6)",
				padding: "6px 16px",
				borderRadius: "4px",
				border: `1px solid ${accent}22`,
				pointerEvents: "none",
				letterSpacing: "0.05em",
				whiteSpace: "nowrap",
			}}
		>
			<span title="Scrap metal stockpile">
				SCRAP:{snap.resources.scrapMetal}
			</span>
			<span title="E-waste stockpile">
				E-WASTE:{snap.resources.eWaste}
			</span>
			<span title="Intact components stockpile">
				PARTS:{snap.resources.intactComponents}
			</span>
			<span style={{ color: stormColor }} title="Storm intensity">
				STORM:{(snap.power.stormIntensity * 100).toFixed(0)}%
			</span>
			<span title="Power: generation / demand">
				PWR:{snap.power.totalGeneration.toFixed(0)}/
				{snap.power.totalDemand.toFixed(0)}
			</span>
		</div>
	);
}

const SPEED_OPTIONS = [0.5, 1, 2] as const;

function SpeedControls() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const accent = getHUDAccent();

	const onHalf = useCallback(() => setGameSpeed(0.5), []);
	const onNormal = useCallback(() => setGameSpeed(1), []);
	const onDouble = useCallback(() => setGameSpeed(2), []);
	const speedHandlers = useMemo(
		() => [onHalf, onNormal, onDouble],
		[onHalf, onNormal, onDouble],
	);

	return (
		<div
			style={{
				position: "absolute",
				top: `calc(12px + env(safe-area-inset-top, 0px))`,
				right: `calc(16px + env(safe-area-inset-right, 0px))`,
				display: "flex",
				gap: "4px",
				pointerEvents: "auto",
			}}
		>
			{SPEED_OPTIONS.map((s, i) => (
				<button
					key={s}
					onClick={speedHandlers[i]}
					aria-label={`Set game speed to ${s}x`}
					aria-pressed={snap.gameSpeed === s && !snap.paused}
					style={{
						background:
							snap.gameSpeed === s && !snap.paused
								? accent
								: "rgba(0,0,0,0.6)",
						color: snap.gameSpeed === s && !snap.paused ? "#000" : accent,
						border: `1px solid ${accent}44`,
						borderRadius: "3px",
						padding: "3px 8px",
						fontSize: "11px",
						cursor: "pointer",
						fontFamily: MONO,
						minWidth: "36px",
						minHeight: "28px",
					}}
				>
					{s}x
				</button>
			))}
			<button
				onClick={togglePause}
				aria-label={snap.paused ? "Resume colony simulation" : "Pause colony simulation"}
				aria-pressed={snap.paused}
				style={{
					background: snap.paused ? "#ffaa00" : "rgba(0,0,0,0.6)",
					color: snap.paused ? "#000" : accent,
					border: `1px solid ${accent}44`,
					borderRadius: "3px",
					padding: "3px 8px",
					fontSize: "11px",
					cursor: "pointer",
					fontFamily: MONO,
					minWidth: "36px",
					minHeight: "28px",
				}}
			>
				{snap.paused ? "RESUME" : "PAUSE"}
			</button>
		</div>
	);
}

const Hints = memo(function Hints() {
	const bot = getActivePlayerBot();
	const accent = getHUDAccent();
	if (!bot) return null;

	return (
		<div
			aria-label="Control hints"
			style={{
				position: "absolute",
				bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
				right: `calc(16px + env(safe-area-inset-right, 0px))`,
				color: `${accent}44`,
				fontSize: "10px",
				textAlign: "right",
				lineHeight: "1.8",
				pointerEvents: "none",
				letterSpacing: "0.05em",
			}}
		>
			<div>WASD — move</div>
			<div>MOUSE — look</div>
			<div>E — interact</div>
			<div>F — harvest ore</div>
			<div>C — compress powder</div>
			<div>G — grab/drop cube</div>
			<div>Q — switch unit</div>
			<div>CLICK — select</div>
		</div>
	);
});

function SelectedInfo() {
	// Subscribe to trigger re-renders on state changes
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const accent = getHUDAccent();
	const selectedUnit = useMemo(
		() => Array.from(units).find((u) => u.unit.selected) ?? null,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[snap],
	);
	const selectedBuilding = useMemo(
		() => Array.from(buildings).find((b) => b.building.selected && !b.unit) ?? null,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[snap],
	);

	if (!selectedUnit && !selectedBuilding) return null;

	if (selectedUnit) {
		return (
			<div
				style={{
					position: "absolute",
					top: "50%",
					right: `calc(16px + env(safe-area-inset-right, 0px))`,
					transform: "translateY(-50%)",
					background: "rgba(0, 8, 4, 0.8)",
					border: `1px solid ${accent}33`,
					borderRadius: "6px",
					padding: "10px 14px",
					pointerEvents: "none",
					maxWidth: "200px",
					fontSize: "12px",
					color: accent,
				}}
			>
				<div style={{ fontSize: "9px", color: `${accent}55`, letterSpacing: "0.2em", marginBottom: "4px" }}>
					{selectedUnit.faction === "player" ? "COLONY UNIT" : "RIVAL UNIT"}
				</div>
				<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
					{selectedUnit.unit.displayName}
				</div>
				<div
					style={{ fontSize: "10px", color: `${accent}66`, marginBottom: "6px" }}
				>
					{selectedUnit.unit.type.replace(/_/g, " ").toUpperCase()}
					{selectedUnit.faction !== "player" && (
						<span style={{ color: "#ff4444", marginLeft: "8px" }}>HOSTILE</span>
					)}
				</div>
				{selectedUnit.unit.components.map((comp, i) => (
					<ComponentBar key={i} comp={comp} />
				))}
			</div>
		);
	}

	if (selectedBuilding) {
		return (
			<div
				style={{
					position: "absolute",
					top: "50%",
					right: `calc(16px + env(safe-area-inset-right, 0px))`,
					transform: "translateY(-50%)",
					background: "rgba(0, 8, 4, 0.8)",
					border: "1px solid #aa884433",
					borderRadius: "6px",
					padding: "10px 14px",
					pointerEvents: "none",
					maxWidth: "200px",
					fontSize: "12px",
					color: "#aa8844",
				}}
			>
				<div style={{ fontSize: "9px", color: "#aa884455", letterSpacing: "0.2em", marginBottom: "4px" }}>
					COLONY STRUCTURE
				</div>
				<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
					{selectedBuilding.building.type.replace(/_/g, " ").toUpperCase()}
				</div>
				<div style={{ fontSize: "10px", color: "#aa884466" }}>
					{selectedBuilding.building.powered ? "POWERED" : "UNPOWERED"}
				</div>
			</div>
		);
	}

	return null;
}

function CombatNotifications() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	if (snap.combatEvents.length === 0) return null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			aria-label="Combat alerts"
			style={{
				position: "absolute",
				top: "calc(60px + env(safe-area-inset-top, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(40, 0, 0, 0.85)",
				border: "1px solid #ff444466",
				borderRadius: "6px",
				padding: "6px 14px",
				fontSize: "12px",
				color: "#ff6644",
				pointerEvents: "none",
			}}
		>
			{snap.combatEvents.slice(0, 3).map((e, i) => (
				<div key={i}>
					{e.targetDestroyed
						? `${e.targetId} DESTROYED`
						: `${e.targetId}: ${e.componentDamaged} hit`}
				</div>
			))}
		</div>
	);
}

const ScanLines = memo(function ScanLines() {
	return (
		<div
			aria-hidden="true"
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				background:
					"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
				zIndex: 100,
			}}
		/>
	);
});

export function FPSHUD() {
	return (
		<div
			role="region"
			aria-label="Colony HUD"
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				fontFamily: MONO,
				color: getHUDAccent(),
			}}
		>
			<Crosshair />
			<ResourceBar />
			<SpeedControls />
			<BotStatus />
			<FaithBar />
			<Hints />
			<SelectedInfo />
			<CombatNotifications />
			<ScanLines />
		</div>
	);
}
