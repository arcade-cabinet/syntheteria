/**
 * HUD — in-game heads-up display overlay.
 *
 * Shows cycle counter, resource counters (all non-zero materials),
 * action points, advance button, active production queues,
 * and signal dominance progress.
 *
 * Diegetic vocabulary: CYCLE (not turn), SYNC (not save), ADVANCE (not end turn).
 */

import type { VictoryProgress } from "../../ecs/systems/victorySystem";
import {
	VICTORY_DOMINATION_PERCENT,
	VICTORY_ECONOMIC_TOTAL,
	VICTORY_RESEARCH_POINTS,
	VICTORY_SURVIVAL_TURNS,
} from "../../config/gameDefaults";

export interface ProductionQueueItem {
	building: string;
	product: string;
	turnsLeft: number;
}

/** Shorten material names for compact HUD display. */
const SHORT_NAMES: Record<string, string> = {
	ferrous_scrap: "FER",
	alloy_stock: "ALY",
	polymer_salvage: "PLY",
	conductor_wire: "CND",
	electrolyte: "ELT",
	silicon_wafer: "SIL",
	storm_charge: "STM",
	el_crystal: "ELC",
	scrap_metal: "SCR",
	e_waste: "EWS",
	intact_components: "CMP",
	thermal_fluid: "THR",
	depth_salvage: "DEP",
};

export interface CurrentResearch {
	techName: string;
	progressPoints: number;
	turnsToResearch: number;
	labCount: number;
}

type HUDProps = {
	turn: number;
	ap: number;
	maxAp: number;
	onEndTurn: () => void;
	onSave?: () => void;
	resources: Record<string, number> | null;
	productionQueue?: ProductionQueueItem[];
	victoryProgress?: VictoryProgress | null;
	population?: number;
	popCap?: number;
	isObserverMode?: boolean;
	observerSpeed?: number;
	onSetObserverSpeed?: (speed: number) => void;
	currentResearch?: CurrentResearch | null;
};

const PROGRESS_BAR_BG: React.CSSProperties = {
	height: 3,
	borderRadius: 2,
	background: "rgba(139, 230, 255, 0.15)",
	overflow: "hidden",
	flex: 1,
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
	const pct = Math.min(100, (value / max) * 100);
	return (
		<div style={PROGRESS_BAR_BG}>
			<div
				style={{
					width: `${pct}%`,
					height: "100%",
					background: color,
					borderRadius: 2,
					transition: "width 0.3s ease",
				}}
			/>
		</div>
	);
}

const OBSERVER_SPEEDS = [1, 2, 5, 10] as const;

export function HUD({ turn, ap, maxAp, onEndTurn, onSave, resources, productionQueue, victoryProgress, population, popCap, isObserverMode, observerSpeed, onSetObserverSpeed, currentResearch }: HUDProps) {
	const nonZero = resources
		? Object.entries(resources).filter(([, v]) => v > 0)
		: [];

	return (
		<div
			data-testid="hud"
			style={{
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				padding: "12px 20px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				color: "#8be6ff",
				background:
					"linear-gradient(to top, rgba(3,3,8,0.9) 0%, transparent 100%)",
				pointerEvents: "none",
			}}
		>
			<span
				data-testid="turn-display"
				style={{ fontSize: 12, letterSpacing: "0.15em", opacity: 0.7 }}
			>
				CYCLE {turn}
			</span>
			{population != null && popCap != null && (
				<span
					data-testid="pop-display"
					style={{
						fontSize: 11,
						letterSpacing: "0.1em",
						opacity: population >= popCap ? 1 : 0.7,
						color: population >= popCap ? "#cc4444" : "#8be6ff",
					}}
				>
					POP {population}/{popCap}
				</span>
			)}
			{nonZero.length > 0 && (
				<div
					data-testid="resource-display"
					style={{
						display: "flex",
						gap: 12,
						fontSize: 11,
						fontFamily: "inherit",
						opacity: 0.8,
						flexWrap: "wrap",
						maxWidth: 400,
					}}
				>
					{nonZero.map(([mat, amt]) => (
						<span key={mat} data-testid={`resource-${mat}`}>
							{SHORT_NAMES[mat] ?? mat} {amt}
						</span>
					))}
				</div>
			)}
			{productionQueue && productionQueue.length > 0 && (
				<div
					data-testid="production-queue"
					style={{
						display: "flex",
						gap: 10,
						fontSize: 10,
						fontFamily: "inherit",
						opacity: 0.7,
					}}
				>
					{productionQueue.map((item, i) => (
						<span key={`${item.building}-${i}`} data-testid="production-item">
							{item.building}: {item.product} ({item.turnsLeft}t)
						</span>
					))}
				</div>
			)}
			{/* Current research */}
			{currentResearch && (
				<div
					data-testid="research-display"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontSize: 10,
						fontFamily: "inherit",
						opacity: 0.8,
					}}
				>
					<span style={{ color: "#b088d8", letterSpacing: "0.1em" }}>
						RES: {currentResearch.techName.toUpperCase()}
					</span>
					<ProgressBar
						value={currentResearch.progressPoints}
						max={currentResearch.turnsToResearch}
						color="#b088d8"
					/>
					<span style={{ fontSize: 9, opacity: 0.6 }}>
						{currentResearch.progressPoints}/{currentResearch.turnsToResearch}
					</span>
				</div>
			)}
			{/* Victory progress indicators */}
			{victoryProgress && (
				<div
					data-testid="victory-progress"
					style={{
						display: "flex",
						gap: 8,
						fontSize: 9,
						fontFamily: "inherit",
						opacity: 0.6,
						alignItems: "center",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 60 }}>
						<span>DOM</span>
						<ProgressBar
							value={victoryProgress.territoryPercent}
							max={VICTORY_DOMINATION_PERCENT}
							color="#7ee7cb"
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 60 }}>
						<span>RES</span>
						<ProgressBar
							value={victoryProgress.techPoints}
							max={VICTORY_RESEARCH_POINTS}
							color="#8be6ff"
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 60 }}>
						<span>ECO</span>
						<ProgressBar
							value={victoryProgress.totalResources}
							max={VICTORY_ECONOMIC_TOTAL}
							color="#f6c56a"
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 60 }}>
						<span>SRV</span>
						<ProgressBar
							value={victoryProgress.currentTurn}
							max={VICTORY_SURVIVAL_TURNS}
							color="#aa44ff"
						/>
					</div>
				</div>
			)}
			{!isObserverMode && (
				<span
					data-testid="ap-display"
					style={{ fontSize: 13, letterSpacing: "0.1em" }}
				>
					CYC {ap} / {maxAp}
				</span>
			)}
			{onSave && (
				<button
					type="button"
					data-testid="save-btn"
					onClick={onSave}
					style={{
						pointerEvents: "auto",
						padding: "8px 14px",
						background: "transparent",
						border: "1px solid rgba(139,230,255,0.25)",
						borderRadius: 4,
						color: "rgba(139,230,255,0.6)",
						fontFamily: "inherit",
						fontSize: 11,
						letterSpacing: "0.15em",
						textTransform: "uppercase",
						cursor: "pointer",
					}}
				>
					Sync
				</button>
			)}
			{isObserverMode ? (
				<div
					data-testid="observer-controls"
					style={{
						pointerEvents: "auto",
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					<span
						style={{
							fontSize: 11,
							letterSpacing: "0.15em",
							opacity: 0.7,
						}}
					>
						OBSERVING
					</span>
					{OBSERVER_SPEEDS.map((speed) => (
						<button
							key={speed}
							type="button"
							data-testid={`observer-speed-${speed}`}
							onClick={() => onSetObserverSpeed?.(speed)}
							style={{
								padding: "4px 8px",
								background: observerSpeed === speed ? "rgba(139,230,255,0.2)" : "transparent",
								border: `1px solid rgba(139,230,255,${observerSpeed === speed ? 0.6 : 0.2})`,
								borderRadius: 3,
								color: observerSpeed === speed ? "#8be6ff" : "rgba(139,230,255,0.4)",
								fontFamily: "inherit",
								fontSize: 10,
								cursor: "pointer",
							}}
						>
							{speed}x
						</button>
					))}
				</div>
			) : (
				<button
					type="button"
					data-testid="end-turn-btn"
					onClick={onEndTurn}
					style={{
						pointerEvents: "auto",
						padding: "8px 20px",
						background: "transparent",
						border: "1px solid rgba(139,230,255,0.4)",
						borderRadius: 4,
						color: "#8be6ff",
						fontFamily: "inherit",
						fontSize: 12,
						letterSpacing: "0.2em",
						textTransform: "uppercase",
						cursor: "pointer",
					}}
				>
					Advance
				</button>
			)}
		</div>
	);
}
