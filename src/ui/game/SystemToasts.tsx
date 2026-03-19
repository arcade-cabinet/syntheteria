/**
 * SystemToasts — renders brief system-level notifications (autosave, manual save, etc.)
 *
 * Positioned bottom-left to avoid colliding with the gameplay Notifications
 * panel (bottom-right). Auto-purges expired toasts.
 *
 * Ported from pending/ui/panels/SystemToasts.tsx — rewired to local toastStore.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
	getToasts,
	purgeExpiredToasts,
	subscribeToasts,
	type ToastMessage,
} from "./toastStore";

const TOAST_LIFETIME_MS = 4000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 300;

const TONE_COLORS: Record<
	ToastMessage["tone"],
	{ text: string; border: string }
> = {
	info: { text: "#8be6ff", border: "rgba(139, 230, 255, 0.25)" },
	success: { text: "#7ee7cb", border: "rgba(126, 231, 203, 0.25)" },
	warn: { text: "#f6c56a", border: "rgba(246, 197, 106, 0.25)" },
	error: { text: "#ff8f8f", border: "rgba(255, 143, 143, 0.25)" },
};

function ToastCard({ toast }: { toast: ToastMessage }) {
	const cardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = cardRef.current;
		if (!el) return;
		// Fade in
		el.style.opacity = "0";
		const t1 = setTimeout(() => {
			el.style.transition = `opacity ${FADE_IN_MS}ms ease`;
			el.style.opacity = "1";
		}, 16);
		// Fade out
		const t2 = setTimeout(() => {
			el.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
			el.style.opacity = "0";
		}, TOAST_LIFETIME_MS);

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, []);

	const colors = TONE_COLORS[toast.tone];

	return (
		<div
			ref={cardRef}
			style={{
				opacity: 0,
				minWidth: 180,
				maxWidth: 280,
				borderRadius: 8,
				borderWidth: 1,
				borderStyle: "solid",
				borderColor: colors.border,
				backgroundColor: "rgba(12, 16, 20, 0.88)",
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: colors.text,
					letterSpacing: 0.5,
				}}
			>
				{toast.text}
			</span>
		</div>
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
		<div
			style={{
				position: "absolute",
				left: 16,
				bottom: 80,
				gap: 6,
				display: "flex",
				flexDirection: "column",
				alignItems: "flex-start",
				pointerEvents: "none",
			}}
		>
			{toasts.map((toast) => (
				<ToastCard key={toast.id} toast={toast} />
			))}
		</div>
	);
}
