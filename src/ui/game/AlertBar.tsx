/**
 * AlertBar — diegetic alert pips for off-screen events.
 *
 * Shows "SIGNAL ANOMALY - BEARING 270" style alerts when events
 * happen outside the player's viewport. Click to jump camera.
 *
 * Uses a module-level event channel (same pattern as toastNotifications).
 */

import { useCallback, useEffect, useState } from "react";
import { getCameraControls } from "../../camera";
import { TILE_SIZE_M } from "../../config";

// ─── Alert Channel (module-level, same pattern as toastNotifications) ────────

export type AlertCategory =
	| "contact"
	| "attack"
	| "cult"
	| "construction"
	| "diplomacy";

export interface GameAlert {
	id: string;
	category: AlertCategory;
	message: string;
	tileX: number;
	tileZ: number;
	createdAt: number;
	duration: number;
}

const ALERT_LABELS: Record<AlertCategory, string> = {
	contact: "SIGNAL ANOMALY",
	attack: "HOSTILE ACTION",
	cult: "CORRUPTION SURGE",
	construction: "BUILD COMPLETE",
	diplomacy: "SIGNAL INTERCEPT",
};

let alerts: GameAlert[] = [];
let nextAlertId = 1;
const alertListeners = new Set<() => void>();
const alertTimers = new Map<string, ReturnType<typeof setTimeout>>();

const MAX_ALERTS = 5;
const DEFAULT_ALERT_DURATION = 8000;

function notifyAlertListeners() {
	for (const listener of alertListeners) {
		listener();
	}
}

/**
 * Push a game alert. Called by systems when off-screen events occur.
 */
export function pushAlert(
	category: AlertCategory,
	message: string,
	tileX: number,
	tileZ: number,
	duration = DEFAULT_ALERT_DURATION,
): string {
	const id = `alert-${nextAlertId++}`;
	const alert: GameAlert = {
		id,
		category,
		message,
		tileX,
		tileZ,
		createdAt: Date.now(),
		duration,
	};

	alerts = [alert, ...alerts];

	// Trim excess
	if (alerts.length > MAX_ALERTS) {
		const removed = alerts.splice(MAX_ALERTS);
		for (const r of removed) {
			const timer = alertTimers.get(r.id);
			if (timer) {
				clearTimeout(timer);
				alertTimers.delete(r.id);
			}
		}
	}

	// Auto-dismiss
	if (duration > 0) {
		const timer = setTimeout(() => {
			dismissAlert(id);
		}, duration);
		alertTimers.set(id, timer);
	}

	notifyAlertListeners();
	return id;
}

export function dismissAlert(id: string): void {
	const timer = alertTimers.get(id);
	if (timer) {
		clearTimeout(timer);
		alertTimers.delete(id);
	}
	alerts = alerts.filter((a) => a.id !== id);
	notifyAlertListeners();
}

export function subscribeAlerts(listener: () => void): () => void {
	alertListeners.add(listener);
	return () => alertListeners.delete(listener);
}

export function getVisibleAlerts(): GameAlert[] {
	return alerts.slice(0, MAX_ALERTS);
}

export function _resetAlerts(): void {
	for (const [, timer] of alertTimers) {
		clearTimeout(timer);
	}
	alertTimers.clear();
	alerts = [];
	nextAlertId = 1;
	notifyAlertListeners();
}

// ─── Bearing computation ─────────────────────────────────────────────────────

function computeBearing(
	fromX: number,
	fromZ: number,
	toX: number,
	toZ: number,
): number {
	const dx = toX - fromX;
	const dz = toZ - fromZ;
	const radians = Math.atan2(dx, -dz); // north = -Z
	const degrees = ((radians * 180) / Math.PI + 360) % 360;
	return Math.round(degrees);
}

// ─── React Component ─────────────────────────────────────────────────────────

type AlertBarProps = {
	/** Camera center in tile coordinates (for bearing calculation). */
	cameraTileX?: number;
	cameraTileZ?: number;
};

export function AlertBar({ cameraTileX = 0, cameraTileZ = 0 }: AlertBarProps) {
	const [, setTick] = useState(0);

	useEffect(() => {
		const unsub = subscribeAlerts(() => setTick((t) => t + 1));
		return unsub;
	}, []);

	const handleJump = useCallback((alert: GameAlert) => {
		const cam = getCameraControls();
		if (cam) {
			cam.panTo(alert.tileX * TILE_SIZE_M, alert.tileZ * TILE_SIZE_M);
		}
		dismissAlert(alert.id);
	}, []);

	const visible = getVisibleAlerts();
	if (visible.length === 0) return null;

	return (
		<div
			data-testid="alert-bar"
			style={{
				position: "absolute",
				top: 48,
				right: 12,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				zIndex: 42,
				pointerEvents: "auto",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				maxWidth: 320,
			}}
		>
			{visible.map((alert) => {
				const bearing = computeBearing(
					cameraTileX,
					cameraTileZ,
					alert.tileX,
					alert.tileZ,
				);
				const label = ALERT_LABELS[alert.category] ?? "SIGNAL";
				const categoryColor =
					alert.category === "attack"
						? "#cc4444"
						: alert.category === "cult"
							? "#aa44aa"
							: alert.category === "diplomacy"
								? "#f6c56a"
								: "#8be6ff";

				// Fade out animation based on age
				const age = Date.now() - alert.createdAt;
				const fadeStart = alert.duration * 0.7;
				const opacity =
					age > fadeStart
						? Math.max(0.3, 1 - (age - fadeStart) / (alert.duration * 0.3))
						: 1;

				return (
					<button
						key={alert.id}
						type="button"
						data-testid={`alert-${alert.id}`}
						onClick={() => handleJump(alert)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "5px 10px",
							borderRadius: 4,
							border: `1px solid ${categoryColor}44`,
							background: `rgba(3, 3, 8, 0.85)`,
							cursor: "pointer",
							opacity,
							transition: "opacity 0.3s ease",
							textAlign: "left",
							fontFamily: "inherit",
						}}
					>
						{/* Pip */}
						<span
							style={{
								width: 6,
								height: 6,
								borderRadius: "50%",
								backgroundColor: categoryColor,
								flexShrink: 0,
								animation: "pulse 2s infinite",
							}}
						/>
						{/* Content */}
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontSize: 9,
									color: categoryColor,
									letterSpacing: "0.15em",
									textTransform: "uppercase",
								}}
							>
								{label} — BEARING {bearing.toString().padStart(3, "0")}
							</div>
							{alert.message && (
								<div
									style={{
										fontSize: 8,
										color: "rgba(255,255,255,0.35)",
										marginTop: 1,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{alert.message}
								</div>
							)}
						</div>
						{/* Dismiss */}
						<span
							style={{
								fontSize: 12,
								color: "rgba(255,255,255,0.2)",
								flexShrink: 0,
							}}
						>
							{"\u00D7"}
						</span>
					</button>
				);
			})}
		</div>
	);
}
