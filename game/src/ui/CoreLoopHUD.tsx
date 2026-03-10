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
 *
 * Machine-vision aesthetic matching FPSHUD (terminal green, monospace).
 */

import { useCallback, useSyncExternalStore } from "react";
import {
	getCoreLoopSnapshot,
	subscribeCoreLoop,
} from "../systems/CoreLoopSystem";
import { getAllFurnaces } from "../systems/furnace";
import { getCube, getHeldCube } from "../systems/grabber";
import { getMenuState, subscribeMenu } from "../systems/InteractionSystem";
import { ORE_TYPE_CONFIGS } from "../systems/oreSpawner";
import { RadialActionMenu } from "./RadialActionMenu";

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
			style={{
				position: "absolute",
				top: "50px",
				left: "16px",
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
			style={{
				position: "absolute",
				bottom: "100px",
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
			style={{
				position: "absolute",
				bottom: "70px",
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
			style={{
				position: "absolute",
				bottom: "16px",
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
	useSyncExternalStore(subscribeCoreLoop, getCoreLoopSnapshot);

	const furnaces = getAllFurnaces();
	const activeFurnaces = furnaces.filter((f) => f.isProcessing);

	if (activeFurnaces.length === 0) return null;

	return (
		<div
			style={{
				position: "absolute",
				top: "50px",
				right: "16px",
				background: "rgba(0, 8, 4, 0.75)",
				border: "1px solid #ff660033",
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				minWidth: "120px",
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
			{activeFurnaces.map((f) => (
				<div key={f.id} style={{ marginBottom: "4px" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "11px",
							color: "#ff6600",
						}}
					>
						<span>
							{(f.currentItem ?? "").replace(/_/g, " ").toUpperCase()}
						</span>
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
				</div>
			))}
		</div>
	);
}

function ActionMenuOverlay() {
	const menu = useSyncExternalStore(subscribeMenu, getMenuState);

	const handleAction = useCallback((actionId: string) => {
		window.dispatchEvent(
			new CustomEvent("coreloop:action", {
				detail: { actionId },
			}),
		);
	}, []);

	const handleDismiss = useCallback(() => {
		window.dispatchEvent(
			new CustomEvent("coreloop:action", {
				detail: { actionId: "__dismiss__" },
			}),
		);
	}, []);

	if (!menu.visible || menu.actions.length === 0) return null;

	return (
		<RadialActionMenu
			actions={menu.actions}
			position={menu.position}
			onAction={handleAction}
			onDismiss={handleDismiss}
		/>
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
			<PowderStorage />
			<HarvestingIndicator />
			<CompressionBar />
			<HeldCubeIndicator />
			<FurnaceStatus />
			<ActionMenuOverlay />
		</div>
	);
}
