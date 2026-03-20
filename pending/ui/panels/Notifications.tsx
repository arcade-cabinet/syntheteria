/**
 * Notifications — toast-style notification cards that auto-dismiss.
 *
 * Shows brief, non-blocking combat alerts and topology events.
 * Cards fade in, stay for 4 seconds, then fade out.
 * Positioned bottom-right to avoid crowding the top bar.
 * Pointer events pass through so gameplay is not blocked.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { AlertIcon, MapIcon } from "../icons";

const AUTO_DISMISS_MS = 4000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 300;

interface ToastEntry {
	key: string;
	type: "combat" | "merge";
	title: string;
	body: string;
	iconColor: string;
	borderColor: string;
	createdAt: number;
}

function useAutoFade(durationMs: number) {
	const [opacity, setOpacity] = useState(0);

	useEffect(() => {
		// Fade in
		const fadeInId = requestAnimationFrame(() => {
			setOpacity(1);
		});

		const timeout = setTimeout(() => {
			setOpacity(0);
		}, durationMs);

		return () => {
			cancelAnimationFrame(fadeInId);
			clearTimeout(timeout);
		};
	}, [durationMs]);

	return opacity;
}

function ToastCard({ toast }: { toast: ToastEntry }) {
	const opacity = useAutoFade(AUTO_DISMISS_MS);

	return (
		<div
			style={{
				opacity,
				transition: `opacity ${FADE_IN_MS}ms ease-in, opacity ${FADE_OUT_MS}ms ease-out`,
				minWidth: 220,
				maxWidth: 300,
				borderRadius: 10,
				border: `1px solid ${toast.borderColor}`,
				backgroundColor: "rgba(12, 16, 20, 0.88)",
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
				}}
			>
				{toast.type === "combat" ? (
					<AlertIcon width={12} height={12} color={toast.iconColor} />
				) : (
					<MapIcon width={12} height={12} color={toast.iconColor} />
				)}
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						textTransform: "uppercase",
						letterSpacing: 1.5,
						color: toast.iconColor,
					}}
				>
					{toast.title}
				</span>
			</div>
			<p
				style={{
					margin: 0,
					marginTop: 4,
					fontFamily: "monospace",
					fontSize: 11,
					color: "rgba(255, 255, 255, 0.75)",
					letterSpacing: 0.3,
					overflow: "hidden",
					display: "-webkit-box",
					WebkitLineClamp: 2,
					WebkitBoxOrient: "vertical",
				}}
			>
				{toast.body}
			</p>
		</div>
	);
}

export function Notifications() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [toasts, setToasts] = useState<ToastEntry[]>([]);
	const seenKeysRef = useRef(new Set<string>());

	// Build new toasts from game snapshot, deduplicating
	useEffect(() => {
		const now = Date.now();
		const newToasts: ToastEntry[] = [];

		for (let i = 0; i < Math.min(snap.combatEvents.length, 2); i++) {
			const event = snap.combatEvents[i];
			const key = `combat-${event.targetId}-${event.componentDamaged}-${i}`;
			if (!seenKeysRef.current.has(key)) {
				seenKeysRef.current.add(key);
				newToasts.push({
					key,
					type: "combat",
					title: "Combat",
					body: event.targetDestroyed
						? `${event.targetId} destroyed`
						: `${event.targetId} hit`,
					iconColor: "#ff8f8f",
					borderColor: "rgba(255, 143, 143, 0.2)",
					createdAt: now,
				});
			}
		}

		if (snap.mergeEvents.length > 0) {
			const key = `merge-${snap.mergeEvents.length}`;
			if (!seenKeysRef.current.has(key)) {
				seenKeysRef.current.add(key);
				newToasts.push({
					key,
					type: "merge",
					title: "Topology",
					body: "Map fragments linked",
					iconColor: "#6ff3c8",
					borderColor: "rgba(111, 243, 200, 0.2)",
					createdAt: now,
				});
			}
		}

		if (newToasts.length > 0) {
			setToasts((prev) => [...newToasts, ...prev].slice(0, 4));
		}
	}, [snap.combatEvents, snap.mergeEvents]);

	// Purge expired toasts
	useEffect(() => {
		const interval = setInterval(() => {
			const cutoff = Date.now() - AUTO_DISMISS_MS - FADE_OUT_MS;
			setToasts((prev) => prev.filter((t) => t.createdAt > cutoff));
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	if (toasts.length === 0) return null;

	return (
		<div
			style={{
				position: "absolute",
				right: 16,
				bottom: 80,
				display: "flex",
				flexDirection: "column",
				gap: 6,
				alignItems: "flex-end",
				pointerEvents: "none",
			}}
		>
			{toasts.map((toast) => (
				<ToastCard key={toast.key} toast={toast} />
			))}
		</div>
	);
}
