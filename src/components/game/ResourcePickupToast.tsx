/**
 * ResourcePickupToast — floating "+2 Fe" feedback when resources are scavenged.
 *
 * Listens to resource changes between snapshots and shows animated
 * toast notifications for each material gained. Auto-dismisses after 2 seconds.
 * Notifications stack vertically and float up with a fade-out animation.
 */

import { useEffect, useRef, useState } from "react";
import type { ResourcePool } from "../../systems/resources";

interface PickupNotification {
	id: number;
	label: string;
	amount: number;
	colorClass: string;
	timestamp: number;
}

let nextPickupId = 0;

/** Short labels for resource types. */
const RESOURCE_LABELS: Record<
	keyof ResourcePool,
	{ label: string; color: string }
> = {
	scrapMetal: { label: "Fe", color: "text-emerald-300" },
	circuitry: { label: "Ci", color: "text-sky-400" },
	powerCells: { label: "Pw", color: "text-amber-400" },
	durasteel: { label: "Du", color: "text-violet-400" },
};

/** Toast display duration in milliseconds. */
const TOAST_DURATION_MS = 2000;

interface ResourcePickupToastProps {
	resources: ResourcePool;
}

export function ResourcePickupToast({ resources }: ResourcePickupToastProps) {
	const [notifications, setNotifications] = useState<PickupNotification[]>([]);
	const prevResourcesRef = useRef<ResourcePool | null>(null);

	useEffect(() => {
		const prev = prevResourcesRef.current;
		prevResourcesRef.current = { ...resources };

		// Skip first render (no previous to compare)
		if (!prev) return;

		const newPickups: PickupNotification[] = [];
		const now = Date.now();

		for (const [key, def] of Object.entries(RESOURCE_LABELS)) {
			const k = key as keyof ResourcePool;
			const diff = resources[k] - prev[k];
			if (diff > 0) {
				newPickups.push({
					id: nextPickupId++,
					label: def.label,
					amount: diff,
					colorClass: def.color,
					timestamp: now,
				});
			}
		}

		if (newPickups.length > 0) {
			setNotifications((p) => [...p, ...newPickups].slice(-8)); // cap at 8
		}
	}, [resources]);

	// Auto-dismiss old notifications
	useEffect(() => {
		if (notifications.length === 0) return;

		const timer = setInterval(() => {
			const now = Date.now();
			setNotifications((prev) =>
				prev.filter((n) => now - n.timestamp < TOAST_DURATION_MS),
			);
		}, 250);

		return () => clearInterval(timer);
	}, [notifications.length]);

	if (notifications.length === 0) return null;

	return (
		<div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-1 pointer-events-none z-40">
			{notifications.map((n) => (
				<div
					key={n.id}
					className={`${n.colorClass} text-sm font-bold tracking-wide text-center animate-[floatUp_2s_ease-out_forwards] opacity-0`}
					style={{
						animation: "floatUp 2s ease-out forwards",
						textShadow: "0 0 8px currentColor, 0 1px 3px rgba(0,0,0,0.8)",
					}}
				>
					+{n.amount} {n.label}
				</div>
			))}
		</div>
	);
}
