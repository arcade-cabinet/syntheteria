/**
 * UnitDeathToast — prominent death notification when player units die.
 *
 * Shows a red notification bar at the top-center of the screen when
 * a player unit is destroyed in combat. Auto-dismisses after 4 seconds.
 * Stacks multiple deaths with a count if several die in quick succession.
 */

import { useEffect, useRef, useState } from "react";
import type { CombatEvent } from "../../systems/combat";

interface DeathNotification {
	id: number;
	unitName: string;
	timestamp: number;
}

let nextId = 0;

interface UnitDeathToastProps {
	combatEvents: CombatEvent[];
}

/** Toast display duration in milliseconds. */
const TOAST_DURATION_MS = 4000;

export function UnitDeathToast({ combatEvents }: UnitDeathToastProps) {
	const [notifications, setNotifications] = useState<DeathNotification[]>([]);
	const processedRef = useRef(new Set<string>());

	useEffect(() => {
		const newDeaths: DeathNotification[] = [];
		const now = Date.now();

		for (const event of combatEvents) {
			if (!event.targetDestroyed) continue;
			// Deduplicate: don't re-toast the same death in the same tick
			if (processedRef.current.has(event.targetId)) continue;
			processedRef.current.add(event.targetId);

			newDeaths.push({
				id: nextId++,
				unitName: event.targetId,
				timestamp: now,
			});
		}

		if (newDeaths.length > 0) {
			setNotifications((prev) => [...prev, ...newDeaths]);
		}

		// Clean up processed set when combat events change
		if (combatEvents.length === 0) {
			processedRef.current.clear();
		}
	}, [combatEvents]);

	// Auto-dismiss old notifications
	useEffect(() => {
		if (notifications.length === 0) return;

		const timer = setInterval(() => {
			const now = Date.now();
			setNotifications((prev) =>
				prev.filter((n) => now - n.timestamp < TOAST_DURATION_MS),
			);
		}, 500);

		return () => clearInterval(timer);
	}, [notifications.length]);

	if (notifications.length === 0) return null;

	return (
		<div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col gap-2 pointer-events-none z-40">
			{notifications.map((n) => (
				<div
					key={n.id}
					className="bg-red-900/90 border border-red-500/60 rounded-lg px-5 py-2.5 text-red-200 text-sm font-bold tracking-wide shadow-lg shadow-red-900/40 animate-[fadeIn_0.3s_ease-out]"
				>
					UNIT LOST: {n.unitName}
				</div>
			))}
		</div>
	);
}
