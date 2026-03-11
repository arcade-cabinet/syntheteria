/**
 * CoreLoopHUD — HUD overlay showing core loop state.
 *
 * Displays:
 * - Powder storage per ore type
 * - Compression progress bar (when active)
 * - Harvesting progress indicator
 * - Held cube indicator
 * - Furnace status (when near furnace)
 * - Radial action menu (when an entity is selected)
 * - Furnace detail panel (opened via "open" action on a furnace)
 *
 * Machine-vision aesthetic matching FPSHUD (terminal green, monospace).
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import {
	getCoreLoopSnapshot,
	subscribeCoreLoop,
} from "../systems/CoreLoopSystem";
import { getFurnaceState } from "../systems/furnace";
import {
	DEFAULT_RECIPES,
	getSmeltingProgress,
} from "../systems/furnaceProcessing";
import { getCube, getHeldCube } from "../systems/grabber";
import { ORE_TYPE_CONFIGS } from "../systems/oreSpawner";
import { getPlayerState } from "../systems/playerEntity";
import {
	calculateXPToNextLevel,
	getPlayerStats,
} from "../systems/progressionSystem";
import { ObjectActionMenu } from "./ObjectActionMenu";
import {
	buildHealthGauge,
	buildPowderGauge,
	buildXPBarInfo,
	fillToCSSPercent,
} from "./hudGauges";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PowderStorage() {
	const snap = useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	const entries = Array.from(snap.powderStorage.entries());
	if (entries.length === 0) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Powder storage"
			style={{
				position: "absolute",
				top: "calc(50px + env(safe-area-inset-top, 0px))",
				left: "calc(16px + env(safe-area-inset-left, 0px))",
				background: "rgba(0, 8, 4, 0.75)",
				border: "1px solid #00ffaa33",
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				minWidth: "120px",
			}}
		>
			<div
				style={{
					color: "#00ffaa88",
					fontSize: "10px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				POWDER STORAGE
			</div>
			{entries.map(([type, amount]) => {
				const config = ORE_TYPE_CONFIGS[type];
				return (
					<div
						key={type}
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "8px",
							fontSize: "11px",
							color: "#00ffaa",
							marginBottom: "2px",
						}}
					>
						<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
							<span
								style={{
									display: "inline-block",
									width: "6px",
									height: "6px",
									borderRadius: "50%",
									background: config?.color ?? "#808080",
								}}
							/>
							{type.replace(/_/g, " ").toUpperCase()}
						</span>
						<span style={{ color: "#00ffaa99" }}>{amount.toFixed(1)}</span>
					</div>
				);
			})}
		</div>
	);
}

function HarvestingIndicator() {
	const snap = useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	if (!snap.isHarvesting) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Harvesting active"
			style={{
				position: "absolute",
				bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0, 8, 4, 0.8)",
				border: "1px solid #00ffaa44",
				borderRadius: "4px",
				padding: "6px 14px",
				pointerEvents: "none",
				textAlign: "center",
			}}
		>
			<div
				style={{
					color: "#00ffaa",
					fontSize: "11px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				HARVESTING
			</div>
			<div
				style={{
					color: "#00ffaa88",
					fontSize: "10px",
				}}
			>
				+{snap.harvestPowder.toFixed(1)} powder
			</div>
		</div>
	);
}

function CompressionBar() {
	const snap = useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	if (!snap.isCompressing) return null;

	const pct = snap.compressionProgress * 100;

	return (
		<div
			role="progressbar"
			aria-label="Compression progress"
			aria-valuenow={Math.round(pct)}
			aria-valuemin={0}
			aria-valuemax={100}
			style={{
				position: "absolute",
				bottom: "calc(70px + env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0, 8, 4, 0.8)",
				border: "1px solid #ffaa0044",
				borderRadius: "4px",
				padding: "6px 14px",
				pointerEvents: "none",
				textAlign: "center",
				minWidth: "160px",
			}}
		>
			<div
				aria-hidden="true"
				style={{
					color: "#ffaa00",
					fontSize: "11px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				COMPRESSING {pct.toFixed(0)}%
			</div>
			<div
				aria-hidden="true"
				style={{
					width: "100%",
					height: "4px",
					background: "rgba(255, 170, 0, 0.2)",
					borderRadius: "2px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						background: "#ffaa00",
						borderRadius: "2px",
						transition: "width 0.1s linear",
					}}
				/>
			</div>
		</div>
	);
}

function HeldCubeIndicator() {
	// Subscribe to trigger re-renders when core loop state changes
	useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);
	const heldId = getHeldCube();
	if (!heldId) return null;

	const cube = getCube(heldId);
	const materialName = cube?.material ?? "unknown";

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`Holding ${cube?.material ?? "unknown"} cube`}
			style={{
				position: "absolute",
				bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0, 8, 4, 0.75)",
				border: "1px solid #00aaff44",
				borderRadius: "4px",
				padding: "4px 12px",
				pointerEvents: "none",
				fontSize: "11px",
				color: "#00aaff",
				letterSpacing: "0.05em",
			}}
		>
			HOLDING: {materialName.replace(/_/g, " ").toUpperCase()} CUBE
		</div>
	);
}

function FurnaceStatus() {
	// Re-render when core loop state changes (furnaces process each frame)
	const snap = useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	const visibleFurnaces = snap.furnaces.filter(
		(f) => f.isProcessing || f.hopperSize > 0 || f.isPowered,
	);

	if (visibleFurnaces.length === 0) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Furnace status"
			style={{
				position: "absolute",
				top: "calc(50px + env(safe-area-inset-top, 0px))",
				right: "calc(16px + env(safe-area-inset-right, 0px))",
				background: "rgba(0, 8, 4, 0.75)",
				border: "1px solid #ff660033",
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				minWidth: "140px",
			}}
		>
			<div
				style={{
					color: "#ff660088",
					fontSize: "10px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				FURNACE
			</div>
			{visibleFurnaces.map((f) => (
				<div key={f.id} style={{ marginBottom: "6px" }}>
					{/* Power + hopper status line */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "10px",
							color: f.isPowered ? "#ff660088" : "#ff444488",
							marginBottom: "2px",
						}}
					>
						<span>{f.isPowered ? "POWERED" : "NO POWER"}</span>
						<span>
							HOPPER {f.hopperSize}/{f.maxHopperSize}
						</span>
					</div>
					{f.isProcessing && f.currentItem ? (
						<>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: "11px",
									color: "#ff6600",
								}}
							>
								<span>{f.currentItem.replace(/_/g, " ").toUpperCase()}</span>
								<span>{(f.progress * 100).toFixed(0)}%</span>
							</div>
							<div
								style={{
									width: "100%",
									height: "3px",
									background: "rgba(255, 102, 0, 0.2)",
									borderRadius: "1px",
									overflow: "hidden",
									marginTop: "2px",
								}}
							>
								<div
									style={{
										width: `${f.progress * 100}%`,
										height: "100%",
										background: "#ff6600",
										borderRadius: "1px",
									}}
								/>
							</div>
						</>
					) : (
						<div
							style={{
								fontSize: "10px",
								color: "#ff660044",
							}}
						>
							IDLE
						</div>
					)}
				</div>
			))}
		</div>
	);
}

function FurnaceDetailPanel() {
	const [furnaceId, setFurnaceId] = useState<string | null>(null);

	// Re-render when core loop state changes so progress updates live
	useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ furnaceId: string }>).detail;
			if (detail?.furnaceId) {
				setFurnaceId(detail.furnaceId);
			}
		};
		const handleClose = () => setFurnaceId(null);

		window.addEventListener("coreloop:furnace-open", handleOpen);
		window.addEventListener("coreloop:furnace-close", handleClose);
		return () => {
			window.removeEventListener("coreloop:furnace-open", handleOpen);
			window.removeEventListener("coreloop:furnace-close", handleClose);
		};
	}, []);

	if (!furnaceId) return null;

	const state = getFurnaceState(furnaceId);
	if (!state) return null;

	const progress = getSmeltingProgress(furnaceId);
	const progressPct = (progress * 100).toFixed(0);

	return (
		<div
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				background: "rgba(0, 8, 4, 0.9)",
				border: "1px solid #ff660066",
				borderRadius: "8px",
				padding: "16px 20px",
				pointerEvents: "auto",
				minWidth: "260px",
				fontFamily: MONO,
				zIndex: 100,
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "12px",
				}}
			>
				<div
					style={{
						color: "#ff6600",
						fontSize: "12px",
						letterSpacing: "0.15em",
						fontWeight: "bold",
					}}
				>
					FURNACE [{state.id}]
				</div>
				<button
					type="button"
					onClick={() => setFurnaceId(null)}
					aria-label="Close furnace details"
					style={{
						background: "none",
						border: "1px solid #ff660044",
						borderRadius: "3px",
						color: "#ff660088",
						cursor: "pointer",
						fontSize: "10px",
						padding: "2px 6px",
						fontFamily: MONO,
					}}
				>
					CLOSE
				</button>
			</div>

			{/* Power status */}
			<div
				style={{
					fontSize: "10px",
					color: state.isPowered ? "#00ffaa" : "#ff4444",
					marginBottom: "10px",
					letterSpacing: "0.1em",
				}}
			>
				POWER: {state.isPowered ? "ONLINE" : "OFFLINE"}
			</div>

			{/* Hopper contents */}
			<div
				style={{
					color: "#ff660088",
					fontSize: "10px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				HOPPER [{state.hopperSize}/{state.maxHopperSize}]
			</div>
			<div
				style={{
					marginBottom: "12px",
					padding: "6px 8px",
					background: "rgba(255, 102, 0, 0.08)",
					borderRadius: "4px",
					minHeight: "20px",
				}}
			>
				{state.hopperContents.length === 0 ? (
					<div style={{ color: "#ff660044", fontSize: "10px" }}>EMPTY</div>
				) : (
					state.hopperContents.map((mat, i) => (
						<div
							key={`${mat}-${i}`}
							style={{
								color: "#ff6600",
								fontSize: "11px",
								marginBottom: "1px",
							}}
						>
							{mat.replace(/_/g, " ").toUpperCase()}
						</div>
					))
				)}
			</div>

			{/* Processing status */}
			<div
				style={{
					color: "#ff660088",
					fontSize: "10px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				PROCESSING
			</div>
			{state.isProcessing && state.currentItem ? (
				<div style={{ marginBottom: "12px" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "11px",
							color: "#ff6600",
							marginBottom: "4px",
						}}
					>
						<span>{state.currentItem.replace(/_/g, " ").toUpperCase()}</span>
						<span>{progressPct}%</span>
					</div>
					<div
						style={{
							width: "100%",
							height: "4px",
							background: "rgba(255, 102, 0, 0.2)",
							borderRadius: "2px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								width: `${progressPct}%`,
								height: "100%",
								background: "#ff6600",
								borderRadius: "2px",
								transition: "width 0.1s linear",
							}}
						/>
					</div>
				</div>
			) : (
				<div
					style={{
						color: "#ff660044",
						fontSize: "10px",
						marginBottom: "12px",
					}}
				>
					IDLE
				</div>
			)}

			{/* Available recipes */}
			<div
				style={{
					color: "#ff660088",
					fontSize: "10px",
					letterSpacing: "0.1em",
					marginBottom: "4px",
				}}
			>
				RECIPES
			</div>
			<div
				style={{
					padding: "6px 8px",
					background: "rgba(255, 102, 0, 0.08)",
					borderRadius: "4px",
				}}
			>
				{DEFAULT_RECIPES.map((recipe) => (
					<div
						key={recipe.input}
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "10px",
							color: "#ff660099",
							marginBottom: "2px",
						}}
					>
						<span>{recipe.input.replace(/_/g, " ").toUpperCase()}</span>
						<span>
							{"\u2192"} {recipe.output.replace(/_/g, " ").toUpperCase()} (
							{recipe.smeltTime}s)
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// PlayerStatusBar — health + powder gauges on the left-side panel
// ---------------------------------------------------------------------------

function PlayerStatusBar() {
	// Subscribe to core loop so we re-render when harvest/compression updates
	useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	const player = getPlayerState();
	if (!player) return null;

	const healthGauge = buildHealthGauge(player.health, player.maxHealth);
	const powderGauge = buildPowderGauge(
		player.powderCurrent,
		player.powderCapacity,
		player.powderType,
	);

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Player status"
			style={{
				position: "absolute",
				bottom: "calc(160px + env(safe-area-inset-bottom, 0px))",
				left: "calc(16px + env(safe-area-inset-left, 0px))",
				background: "rgba(0, 8, 4, 0.78)",
				border: "1px solid #00ffaa22",
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				minWidth: "140px",
			}}
		>
			{/* Section label */}
			<div
				style={{
					color: "#00ffaa55",
					fontSize: "9px",
					letterSpacing: "0.2em",
					marginBottom: "6px",
					textTransform: "uppercase",
				}}
			>
				Bot Status
			</div>

			{/* Health gauge */}
			<div style={{ marginBottom: "6px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "10px",
						color: healthGauge.color,
						marginBottom: "2px",
						letterSpacing: "0.05em",
					}}
					aria-label={healthGauge.label}
				>
					<span>HULL</span>
					<span>
						{Math.round(player.health)}/{Math.round(player.maxHealth)}
					</span>
				</div>
				<div
					aria-hidden="true"
					style={{
						width: "100%",
						height: "4px",
						background: "rgba(0,255,136,0.1)",
						borderRadius: "2px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							width: fillToCSSPercent(healthGauge.fill),
							height: "100%",
							background: healthGauge.color,
							borderRadius: "2px",
							transition: "width 0.2s ease-out",
						}}
					/>
				</div>
			</div>

			{/* Powder gauge */}
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "10px",
						color: powderGauge.color,
						marginBottom: "2px",
						letterSpacing: "0.05em",
					}}
					aria-label={powderGauge.label}
				>
					<span>
						POWDER
						{player.powderType && (
							<span style={{ color: "#ffaa0066", marginLeft: "4px" }}>
								{player.powderType.replace(/_/g, " ").toUpperCase()}
							</span>
						)}
					</span>
					<span>
						{player.powderCurrent.toFixed(0)}/{player.powderCapacity}
					</span>
				</div>
				<div
					aria-hidden="true"
					style={{
						width: "100%",
						height: "4px",
						background: "rgba(255,170,0,0.1)",
						borderRadius: "2px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							width: fillToCSSPercent(powderGauge.fill),
							height: "100%",
							background: powderGauge.color,
							borderRadius: "2px",
							transition: "width 0.1s linear",
						}}
					/>
				</div>
				{powderGauge.fill >= 1.0 && (
					<div
						style={{
							color: "#ffdd00",
							fontSize: "9px",
							letterSpacing: "0.12em",
							marginTop: "2px",
							textAlign: "right",
						}}
					>
						COMPRESS READY (C)
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// XPLevelBar — level + XP progress at bottom-left above player status
// ---------------------------------------------------------------------------

function XPLevelBar() {
	// Subscribe so we re-render after XP events
	useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	const stats = getPlayerStats();
	const xpToNext = calculateXPToNextLevel(stats.totalXP);
	const info = buildXPBarInfo(stats.totalXP, xpToNext, stats.level);

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={info.label}
			style={{
				position: "absolute",
				bottom: "calc(260px + env(safe-area-inset-bottom, 0px))",
				left: "calc(16px + env(safe-area-inset-left, 0px))",
				background: "rgba(0, 8, 4, 0.78)",
				border: "1px solid #00ffaa22",
				borderRadius: "6px",
				padding: "6px 12px",
				pointerEvents: "none",
				minWidth: "140px",
			}}
		>
			{/* Level + label */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "10px",
					color: "#00ffaa88",
					marginBottom: "3px",
					letterSpacing: "0.08em",
				}}
			>
				<span style={{ color: "#00ffaa", fontWeight: "bold" }}>
					LVL {info.level}
				</span>
				<span style={{ color: "#00ffaa55" }}>
					{info.xpCurrent} / {info.xpCurrent + info.xpToNext} XP
				</span>
			</div>
			{/* XP bar */}
			<div
				aria-hidden="true"
				style={{
					width: "100%",
					height: "3px",
					background: "rgba(0,255,170,0.1)",
					borderRadius: "2px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: fillToCSSPercent(info.levelProgress),
						height: "100%",
						background: "linear-gradient(90deg, #00ffaa, #00aaff)",
						borderRadius: "2px",
						transition: "width 0.3s ease-out",
					}}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main HUD
// ---------------------------------------------------------------------------

export function CoreLoopHUD() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				fontFamily: MONO,
			}}
		>
			<XPLevelBar />
			<PlayerStatusBar />
			<PowderStorage />
			<HarvestingIndicator />
			<CompressionBar />
			<HeldCubeIndicator />
			<FurnaceStatus />
			<FurnaceDetailPanel />
			<ObjectActionMenu />
		</div>
	);
}
