/**
 * Notifications — toast-style notification cards that auto-dismiss.
 *
 * Shows brief, non-blocking combat alerts and topology events.
 * Cards fade in, stay for 4 seconds, then fade out.
 * Positioned bottom-right to avoid crowding the top bar.
 * Pointer events pass through so gameplay is not blocked.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Text, View } from "react-native";
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
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(opacity, {
			toValue: 1,
			duration: FADE_IN_MS,
			useNativeDriver: true,
		}).start();

		const timeout = setTimeout(() => {
			Animated.timing(opacity, {
				toValue: 0,
				duration: FADE_OUT_MS,
				useNativeDriver: true,
			}).start();
		}, durationMs);

		return () => clearTimeout(timeout);
	}, [opacity, durationMs]);

	return opacity;
}

function ToastCard({ toast }: { toast: ToastEntry }) {
	const opacity = useAutoFade(AUTO_DISMISS_MS);

	return (
		<Animated.View
			style={{
				opacity,
				minWidth: 220,
				maxWidth: 300,
				borderRadius: 10,
				borderWidth: 1,
				borderColor: toast.borderColor,
				backgroundColor: "rgba(12, 16, 20, 0.88)",
				paddingHorizontal: 12,
				paddingVertical: 8,
			}}
		>
			<View
				style={{
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
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						textTransform: "uppercase",
						letterSpacing: 1.5,
						color: toast.iconColor,
					}}
				>
					{toast.title}
				</Text>
			</View>
			<Text
				style={{
					marginTop: 4,
					fontFamily: "monospace",
					fontSize: 11,
					color: "rgba(255, 255, 255, 0.75)",
					letterSpacing: 0.3,
				}}
				numberOfLines={2}
			>
				{toast.body}
			</Text>
		</Animated.View>
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
		<View
			style={{
				position: "absolute",
				right: 16,
				bottom: 80,
				gap: 6,
				alignItems: "flex-end",
				pointerEvents: "none",
			}}
		>
			{toasts.map((toast) => (
				<ToastCard key={toast.key} toast={toast} />
			))}
		</View>
	);
}
