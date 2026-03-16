/**
 * SystemToasts — renders brief system-level notifications (autosave, manual save, etc.)
 *
 * Positioned bottom-left to avoid colliding with the gameplay Notifications
 * panel (bottom-right). Auto-purges expired toasts.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, Text, View } from "react-native";
import {
	getToasts,
	purgeExpiredToasts,
	subscribeToasts,
	type ToastMessage,
} from "../../systems/toastStore";

const TOAST_LIFETIME_MS = 4000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 300;

const TONE_COLORS: Record<
	ToastMessage["tone"],
	{ text: string; border: string }
> = {
	info: { text: "#8be6ff", border: "rgba(139, 230, 255, 0.25)" },
	success: { text: "#6ff3c8", border: "rgba(111, 243, 200, 0.25)" },
	warn: { text: "#f6c56a", border: "rgba(246, 197, 106, 0.25)" },
	error: { text: "#ff8f8f", border: "rgba(255, 143, 143, 0.25)" },
};

function ToastCard({ toast }: { toast: ToastMessage }) {
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
		}, TOAST_LIFETIME_MS);

		return () => clearTimeout(timeout);
	}, [opacity]);

	const colors = TONE_COLORS[toast.tone];

	return (
		<Animated.View
			style={{
				opacity,
				minWidth: 180,
				maxWidth: 280,
				borderRadius: 8,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: "rgba(12, 16, 20, 0.88)",
				paddingHorizontal: 12,
				paddingVertical: 8,
			}}
		>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: colors.text,
					letterSpacing: 0.5,
				}}
			>
				{toast.text}
			</Text>
		</Animated.View>
	);
}

export function SystemToasts() {
	const toasts = useSyncExternalStore(subscribeToasts, getToasts);

	useEffect(() => {
		const interval = setInterval(() => {
			purgeExpiredToasts(TOAST_LIFETIME_MS + FADE_OUT_MS);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	if (toasts.length === 0) return null;

	return (
		<View
			style={{
				position: "absolute",
				left: 16,
				bottom: 80,
				gap: 6,
				alignItems: "flex-start",
				pointerEvents: "none",
			}}
		>
			{toasts.map((toast) => (
				<ToastCard key={toast.id} toast={toast} />
			))}
		</View>
	);
}
