/**
 * Toast Store — simple pub/sub for brief system notifications.
 *
 * Used by autosave, manual save, and other non-gameplay events
 * that need a transient on-screen notification.
 */

export interface ToastMessage {
	id: string;
	text: string;
	tone: "info" | "success" | "warn" | "error";
	createdAt: number;
}

const listeners = new Set<() => void>();
let toasts: ToastMessage[] = [];
let nextId = 1;

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

export function pushToast(
	text: string,
	tone: ToastMessage["tone"] = "info",
) {
	toasts = [
		{ id: `toast_${nextId++}`, text, tone, createdAt: Date.now() },
		...toasts,
	].slice(0, 4);
	notify();
}

export function getToasts(): readonly ToastMessage[] {
	return toasts;
}

export function dismissToast(id: string) {
	toasts = toasts.filter((t) => t.id !== id);
	notify();
}

export function purgeExpiredToasts(maxAgeMs = 5000) {
	const cutoff = Date.now() - maxAgeMs;
	const before = toasts.length;
	toasts = toasts.filter((t) => t.createdAt > cutoff);
	if (toasts.length !== before) {
		notify();
	}
}

export function subscribeToasts(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function resetToastStore() {
	toasts = [];
	nextId = 1;
}
