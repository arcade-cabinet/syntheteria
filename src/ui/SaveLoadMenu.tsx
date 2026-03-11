/**
 * Save/Load menu overlay.
 *
 * Shows 3 manual save slots + 1 autosave slot with save/load/delete actions.
 * Each slot displays a screenshot thumbnail, timestamp, play time, tick count,
 * and entity counts. Includes confirmation dialogs for overwrite and delete.
 * Loading spinner during save/load operations.
 *
 * Thumbnails are captured from the R3F canvas at save time and stored in
 * localStorage keyed by slot ID (separate from the IndexedDB save payload).
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
// Thumbnail helpers — localStorage-backed, keyed per slot
// ---------------------------------------------------------------------------

const THUMB_PREFIX = "syntheteria_thumb_";
const THUMB_W = 160;
const THUMB_H = 90;

/** Capture a JPEG thumbnail from the Three.js canvas (before next RAF). */
function captureThumb(): string | null {
	try {
		const canvas = document.querySelector<HTMLCanvasElement>("canvas");
		if (!canvas) return null;
		const offscreen = document.createElement("canvas");
		offscreen.width = THUMB_W;
		offscreen.height = THUMB_H;
		const ctx = offscreen.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(canvas, 0, 0, THUMB_W, THUMB_H);
		return offscreen.toDataURL("image/jpeg", 0.6);
	} catch {
		return null;
	}
}

function saveThumb(slotId: SaveSlotId, dataUrl: string) {
	try {
		localStorage.setItem(`${THUMB_PREFIX}${slotId}`, dataUrl);
	} catch {
		// Storage quota — ignore
	}
}

function loadThumb(slotId: SaveSlotId): string | null {
	try {
		return localStorage.getItem(`${THUMB_PREFIX}${slotId}`);
	} catch {
		return null;
	}
}

function deleteThumb(slotId: SaveSlotId) {
	try {
		localStorage.removeItem(`${THUMB_PREFIX}${slotId}`);
	} catch {
		// ignore
	}
}

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
			role="alertdialog"
			aria-modal="true"
			aria-label={message}
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
						aria-label="Cancel"
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
						aria-label={confirmLabel}
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
	thumb,
	busy,
	onSave,
	onLoad,
	onDelete,
}: {
	slotId: SaveSlotId;
	info: SaveSlotInfo | null;
	thumb: string | null;
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

			{/* Slot preview + data */}
			{!isEmpty && info && (
				<div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
					{/* Screenshot thumbnail */}
					<div
						aria-hidden="true"
						style={{
							flexShrink: 0,
							width: THUMB_W / 2,
							height: THUMB_H / 2,
							borderRadius: "3px",
							overflow: "hidden",
							background: "rgba(0,0,0,0.5)",
							border: "1px solid #00ffaa22",
						}}
					>
						{thumb ? (
							<img
								src={thumb}
								alt=""
								style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
							/>
						) : (
							<div
								style={{
									width: "100%",
									height: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "9px",
									color: "#00ffaa22",
									letterSpacing: "0.05em",
								}}
							>
								NO PREVIEW
							</div>
						)}
					</div>

					{/* Stats */}
					<div
						style={{
							flex: 1,
							fontSize: "11px",
							color: "#00ffaa88",
							lineHeight: 1.6,
						}}
					>
						<div>{formatDate(info.updatedAt)}</div>
						<div>
							{formatPlayTime(info.playTimeSeconds)} | T{info.tickCount}
						</div>
						<div>
							{info.unitCount}u / {info.buildingCount}b
						</div>
						<div style={{ color: "#00ffaa55" }}>
							{seedToPhrase(info.seed)}
						</div>
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
						ariaLabel={`Save colony to ${slotLabel(slotId)}`}
					/>
				)}

				{/* Load button */}
				<SlotButton
					label="LOAD"
					color="#00aaff"
					disabled={busy || isEmpty}
					onClick={() => onLoad(slotId)}
					ariaLabel={`Load colony from ${slotLabel(slotId)}`}
				/>

				{/* Delete button */}
				<SlotButton
					label="DEL"
					color="#ff4444"
					disabled={busy || isEmpty}
					onClick={() => onDelete(slotId)}
					ariaLabel={`Delete save in ${slotLabel(slotId)}`}
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
	ariaLabel,
}: {
	label: string;
	color: string;
	disabled?: boolean;
	onClick: () => void;
	ariaLabel?: string;
}) {
	return (
		<button
			onClick={disabled ? undefined : onClick}
			aria-label={ariaLabel}
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
	const [thumbs, setThumbs] = useState<Map<SaveSlotId, string | null>>(
		new Map(),
	);
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
			// Reload thumbnails alongside slots
			const tmap = new Map<SaveSlotId, string | null>();
			for (const slotId of ALL_SLOT_IDS) {
				tmap.set(slotId, loadThumb(slotId));
			}
			setThumbs(tmap);
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
		// Capture thumbnail before closing/hiding the game view
		const thumb = captureThumb();
		setBusy(true);
		setBusyMessage("SAVING");
		setConfirm(null);
		try {
			await saveGame(slotId);
			if (thumb) {
				saveThumb(slotId, thumb);
			}
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
			deleteThumb(slotId);
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
			role="dialog"
			aria-modal="true"
			aria-label="Save and load colony"
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
					width: "min(420px, 90vw)",
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
						aria-label="Close save menu"
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
				<div
					role="status"
					aria-live="polite"
					aria-atomic="true"
					style={{
						textAlign: "center",
						fontSize: "12px",
						color: "#00ffaa88",
						marginBottom: statusMessage ? "12px" : "0",
						letterSpacing: "0.05em",
						minHeight: statusMessage ? undefined : "0",
					}}
				>
					{statusMessage ?? ""}
				</div>

				{/* Save slots */}
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{ALL_SLOT_IDS.map((slotId) => (
						<SaveSlotCard
							key={slotId}
							slotId={slotId}
							info={slots.get(slotId) ?? null}
							thumb={thumbs.get(slotId) ?? null}
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
