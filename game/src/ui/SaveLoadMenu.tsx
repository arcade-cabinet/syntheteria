/**
 * Save/Load menu overlay.
 *
 * Shows 3 manual save slots + 1 autosave slot with save/load/delete actions.
 * Each slot displays timestamp, play time, tick count, and entity counts.
 * Includes confirmation dialogs for overwrite and delete.
 * Loading spinner during save/load operations.
 */

import { useCallback, useEffect, useState } from "react";
import { seedToPhrase } from "../ecs/seed";
import {
	ALL_SLOT_IDS,
	deleteSave,
	getSaveSlots,
	loadGame,
	type SaveSlotId,
	type SaveSlotInfo,
	saveGame,
} from "../save/SaveManager";

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPlayTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

function formatDate(timestamp: number): string {
	const d = new Date(timestamp);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slotLabel(slotId: SaveSlotId): string {
	switch (slotId) {
		case "slot_1":
			return "SLOT 1";
		case "slot_2":
			return "SLOT 2";
		case "slot_3":
			return "SLOT 3";
		case "autosave":
			return "AUTOSAVE";
	}
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------

type ConfirmAction =
	| { type: "overwrite"; slotId: SaveSlotId }
	| { type: "delete"; slotId: SaveSlotId }
	| { type: "load"; slotId: SaveSlotId };

function ConfirmDialog({
	action,
	onConfirm,
	onCancel,
}: {
	action: ConfirmAction;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	let message: string;
	let confirmLabel: string;
	let confirmColor: string;

	switch (action.type) {
		case "overwrite":
			message = `Overwrite ${slotLabel(action.slotId)}?`;
			confirmLabel = "OVERWRITE";
			confirmColor = "#ffaa00";
			break;
		case "delete":
			message = `Delete ${slotLabel(action.slotId)}? This cannot be undone.`;
			confirmLabel = "DELETE";
			confirmColor = "#ff4444";
			break;
		case "load":
			message = `Load ${slotLabel(action.slotId)}? Unsaved progress will be lost.`;
			confirmLabel = "LOAD";
			confirmColor = "#00ffaa";
			break;
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0,0,0,0.7)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 10,
			}}
		>
			<div
				style={{
					background: "rgba(0,0,0,0.95)",
					border: `1px solid ${confirmColor}44`,
					borderRadius: "8px",
					padding: "20px 28px",
					maxWidth: "280px",
					textAlign: "center",
					fontFamily: MONO,
				}}
			>
				<div
					style={{
						color: "#00ffaa",
						fontSize: "14px",
						marginBottom: "16px",
						lineHeight: 1.5,
					}}
				>
					{message}
				</div>
				<div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
					<button
						onClick={onCancel}
						style={{
							background: "rgba(255,255,255,0.05)",
							color: "#00ffaa88",
							border: "1px solid #00ffaa33",
							borderRadius: "4px",
							padding: "8px 16px",
							fontFamily: MONO,
							fontSize: "12px",
							cursor: "pointer",
							minWidth: "80px",
							minHeight: "36px",
						}}
					>
						CANCEL
					</button>
					<button
						onClick={onConfirm}
						style={{
							background: `${confirmColor}22`,
							color: confirmColor,
							border: `1px solid ${confirmColor}66`,
							borderRadius: "4px",
							padding: "8px 16px",
							fontFamily: MONO,
							fontSize: "12px",
							cursor: "pointer",
							minWidth: "80px",
							minHeight: "36px",
						}}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Slot card
// ---------------------------------------------------------------------------

function SaveSlotCard({
	slotId,
	info,
	busy,
	onSave,
	onLoad,
	onDelete,
}: {
	slotId: SaveSlotId;
	info: SaveSlotInfo | null;
	busy: boolean;
	onSave: (slotId: SaveSlotId) => void;
	onLoad: (slotId: SaveSlotId) => void;
	onDelete: (slotId: SaveSlotId) => void;
}) {
	const isEmpty = info === null;
	const isAutosave = slotId === "autosave";

	return (
		<div
			style={{
				background: "rgba(0,0,0,0.6)",
				border: isEmpty ? "1px solid #00ffaa22" : "1px solid #00ffaa44",
				borderRadius: "6px",
				padding: "12px 14px",
				opacity: busy ? 0.5 : 1,
				transition: "opacity 0.2s",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: isEmpty ? "0" : "8px",
				}}
			>
				<div
					style={{
						fontSize: "13px",
						fontWeight: "bold",
						color: isAutosave ? "#ffaa00" : "#00ffaa",
						letterSpacing: "0.1em",
					}}
				>
					{slotLabel(slotId)}
				</div>
				{isEmpty && (
					<span
						style={{
							fontSize: "11px",
							color: "#00ffaa44",
							letterSpacing: "0.05em",
						}}
					>
						EMPTY
					</span>
				)}
			</div>

			{/* Slot data */}
			{!isEmpty && info && (
				<div
					style={{
						fontSize: "11px",
						color: "#00ffaa88",
						lineHeight: 1.6,
						marginBottom: "8px",
					}}
				>
					<div>{formatDate(info.updatedAt)}</div>
					<div>
						Play time: {formatPlayTime(info.playTimeSeconds)} | Tick:{" "}
						{info.tickCount}
					</div>
					<div>
						Units: {info.unitCount} | Buildings: {info.buildingCount}
					</div>
					<div style={{ color: "#00ffaa55" }}>
						Seed: {seedToPhrase(info.seed)}
					</div>
				</div>
			)}

			{/* Actions */}
			<div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
				{/* Save button — not shown for autosave slot */}
				{!isAutosave && (
					<SlotButton
						label="SAVE"
						color="#00ffaa"
						disabled={busy}
						onClick={() => onSave(slotId)}
					/>
				)}

				{/* Load button */}
				<SlotButton
					label="LOAD"
					color="#00aaff"
					disabled={busy || isEmpty}
					onClick={() => onLoad(slotId)}
				/>

				{/* Delete button */}
				<SlotButton
					label="DEL"
					color="#ff4444"
					disabled={busy || isEmpty}
					onClick={() => onDelete(slotId)}
				/>
			</div>
		</div>
	);
}

function SlotButton({
	label,
	color,
	disabled,
	onClick,
}: {
	label: string;
	color: string;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
			style={{
				flex: 1,
				background: disabled ? "transparent" : `${color}11`,
				color: disabled ? `${color}33` : color,
				border: `1px solid ${disabled ? `${color}22` : `${color}44`}`,
				borderRadius: "4px",
				padding: "6px 0",
				fontFamily: MONO,
				fontSize: "11px",
				letterSpacing: "0.05em",
				cursor: disabled ? "default" : "pointer",
				minHeight: "32px",
			}}
		>
			{label}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Loading spinner
// ---------------------------------------------------------------------------

function LoadingSpinner({ message }: { message: string }) {
	const [dots, setDots] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((d) => (d.length >= 3 ? "" : `${d}.`));
		}, 400);
		return () => clearInterval(interval);
	}, []);

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0,0,0,0.8)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 20,
			}}
		>
			<div
				style={{
					fontFamily: MONO,
					fontSize: "14px",
					color: "#00ffaa",
					letterSpacing: "0.1em",
				}}
			>
				{message}
				{dots}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main menu component
// ---------------------------------------------------------------------------

export function SaveLoadMenu({
	onClose,
	onLoadComplete,
}: {
	onClose: () => void;
	onLoadComplete?: () => void;
}) {
	const [slots, setSlots] = useState<Map<SaveSlotId, SaveSlotInfo>>(new Map());
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [busyMessage, setBusyMessage] = useState("");
	const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	// Load slot info on mount
	const refreshSlots = useCallback(async () => {
		try {
			const infos = await getSaveSlots();
			const map = new Map<SaveSlotId, SaveSlotInfo>();
			for (const info of infos) {
				map.set(info.slotId, info);
			}
			setSlots(map);
		} catch (err) {
			console.error("[SaveLoadMenu] Failed to load slots:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refreshSlots();
	}, [refreshSlots]);

	// Flash a status message
	const flash = (msg: string) => {
		setStatusMessage(msg);
		setTimeout(() => setStatusMessage(null), 2000);
	};

	// --- Save ---
	const handleSave = (slotId: SaveSlotId) => {
		if (slots.has(slotId)) {
			setConfirm({ type: "overwrite", slotId });
		} else {
			performSave(slotId);
		}
	};

	const performSave = async (slotId: SaveSlotId) => {
		setBusy(true);
		setBusyMessage("SAVING");
		setConfirm(null);
		try {
			await saveGame(slotId);
			await refreshSlots();
			flash("Save complete");
		} catch (err) {
			console.error("[SaveLoadMenu] Save failed:", err);
			flash("Save failed");
		} finally {
			setBusy(false);
			setBusyMessage("");
		}
	};

	// --- Load ---
	const handleLoad = (slotId: SaveSlotId) => {
		setConfirm({ type: "load", slotId });
	};

	const performLoad = async (slotId: SaveSlotId) => {
		setBusy(true);
		setBusyMessage("LOADING");
		setConfirm(null);
		try {
			await loadGame(slotId);
			flash("Load complete");
			onLoadComplete?.();
		} catch (err) {
			console.error("[SaveLoadMenu] Load failed:", err);
			flash("Load failed");
		} finally {
			setBusy(false);
			setBusyMessage("");
		}
	};

	// --- Delete ---
	const handleDelete = (slotId: SaveSlotId) => {
		setConfirm({ type: "delete", slotId });
	};

	const performDelete = async (slotId: SaveSlotId) => {
		setBusy(true);
		setBusyMessage("DELETING");
		setConfirm(null);
		try {
			await deleteSave(slotId);
			await refreshSlots();
			flash("Save deleted");
		} catch (err) {
			console.error("[SaveLoadMenu] Delete failed:", err);
			flash("Delete failed");
		} finally {
			setBusy(false);
			setBusyMessage("");
		}
	};

	// --- Confirm handler ---
	const handleConfirm = () => {
		if (!confirm) return;
		switch (confirm.type) {
			case "overwrite":
				performSave(confirm.slotId);
				break;
			case "load":
				performLoad(confirm.slotId);
				break;
			case "delete":
				performDelete(confirm.slotId);
				break;
		}
	};

	if (loading) {
		return <LoadingSpinner message="LOADING SAVES" />;
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0,0,0,0.88)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 100,
				fontFamily: MONO,
				color: "#00ffaa",
			}}
		>
			{/* Busy overlay */}
			{busy && <LoadingSpinner message={busyMessage} />}

			{/* Confirm dialog */}
			{confirm && (
				<ConfirmDialog
					action={confirm}
					onConfirm={handleConfirm}
					onCancel={() => setConfirm(null)}
				/>
			)}

			{/* Main panel */}
			<div
				style={{
					background: "rgba(0,0,0,0.95)",
					border: "1px solid #00ffaa33",
					borderRadius: "10px",
					padding: "20px",
					width: "min(380px, 90vw)",
					maxHeight: "85vh",
					overflowY: "auto",
					position: "relative",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "16px",
					}}
				>
					<div
						style={{
							fontSize: "16px",
							fontWeight: "bold",
							letterSpacing: "0.15em",
						}}
					>
						SAVE / LOAD
					</div>
					<button
						onClick={onClose}
						style={{
							background: "none",
							border: "1px solid #00ffaa33",
							borderRadius: "4px",
							color: "#00ffaa88",
							fontFamily: MONO,
							fontSize: "12px",
							padding: "4px 10px",
							cursor: "pointer",
							minHeight: "32px",
						}}
					>
						CLOSE
					</button>
				</div>

				{/* Status message */}
				{statusMessage && (
					<div
						style={{
							textAlign: "center",
							fontSize: "12px",
							color: "#00ffaa88",
							marginBottom: "12px",
							letterSpacing: "0.05em",
						}}
					>
						{statusMessage}
					</div>
				)}

				{/* Save slots */}
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{ALL_SLOT_IDS.map((slotId) => (
						<SaveSlotCard
							key={slotId}
							slotId={slotId}
							info={slots.get(slotId) ?? null}
							busy={busy}
							onSave={handleSave}
							onLoad={handleLoad}
							onDelete={handleDelete}
						/>
					))}
				</div>

				{/* Keyboard hint */}
				<div
					style={{
						textAlign: "center",
						fontSize: "10px",
						color: "#00ffaa33",
						marginTop: "16px",
						letterSpacing: "0.05em",
					}}
				>
					ESC to close
				</div>
			</div>
		</div>
	);
}
