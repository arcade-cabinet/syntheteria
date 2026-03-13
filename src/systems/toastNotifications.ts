/**
 * Toast Notification System — event-driven toasts for all game events.
 *
 * Categories: combat, harvest, construction, turn, system, tutorial
 * Auto-dismiss after configurable duration.
 * Stacks up to MAX_VISIBLE notifications.
 * Filterable by category.
 *
 * Consumers subscribe via useSyncExternalStore pattern.
 */

export type ToastCategory =
	| "combat"
	| "harvest"
	| "construction"
	| "turn"
	| "system"
	| "tutorial";

export interface Toast {
	id: string;
	category: ToastCategory;
	title: string;
	message: string;
	/** Timestamp when the toast was created */
	createdAt: number;
	/** Duration in ms before auto-dismiss (0 = manual dismiss only) */
	duration: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;
let nextId = 1;

// ─── State ───────────────────────────────────────────────────────────────────

let toasts: Toast[] = [];
let mutedCategories = new Set<ToastCategory>();
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeToasts(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getVisibleToasts(): Toast[] {
	return toasts.slice(0, MAX_VISIBLE);
}

/**
 * Push a toast notification. Returns the toast ID.
 */
export function pushToast(
	category: ToastCategory,
	title: string,
	message: string,
	duration = DEFAULT_DURATION,
): string {
	if (mutedCategories.has(category)) return "";

	const id = `toast-${nextId++}`;
	const toast: Toast = {
		id,
		category,
		title,
		message,
		createdAt: Date.now(),
		duration,
	};

	toasts = [toast, ...toasts];

	// Trim beyond a reasonable buffer
	if (toasts.length > 10) {
		const removed = toasts.splice(10);
		for (const r of removed) {
			const timer = timers.get(r.id);
			if (timer) {
				clearTimeout(timer);
				timers.delete(r.id);
			}
		}
	}

	// Auto-dismiss timer
	if (duration > 0) {
		const timer = setTimeout(() => {
			dismissToast(id);
		}, duration);
		timers.set(id, timer);
	}

	notify();
	return id;
}

/**
 * Dismiss a specific toast by ID.
 */
export function dismissToast(id: string) {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	toasts = toasts.filter((t) => t.id !== id);
	notify();
}

/**
 * Dismiss all toasts.
 */
export function dismissAllToasts() {
	for (const [_, timer] of timers) {
		clearTimeout(timer);
	}
	timers.clear();
	toasts = [];
	notify();
}

/**
 * Mute a toast category (won't show new toasts of this type).
 */
export function muteCategory(category: ToastCategory) {
	mutedCategories.add(category);
}

/**
 * Unmute a toast category.
 */
export function unmuteCategory(category: ToastCategory) {
	mutedCategories.delete(category);
}

/**
 * Check if a category is muted.
 */
export function isCategoryMuted(category: ToastCategory): boolean {
	return mutedCategories.has(category);
}

/**
 * Get all muted categories.
 */
export function getMutedCategories(): ToastCategory[] {
	return Array.from(mutedCategories);
}

/**
 * Reset — call on new game or tests.
 */
export function _reset() {
	for (const [_, timer] of timers) {
		clearTimeout(timer);
	}
	timers.clear();
	toasts = [];
	mutedCategories = new Set();
	nextId = 1;
	notify();
}
