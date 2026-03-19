/**
 * TurnLog — scrollable event log showing turn events.
 *
 * Fixed DOM overlay on the right side. Shows recent game events
 * like cultist spawns, turret fire, harvest completion, etc.
 */

import { useEffect, useRef, useState } from "react";
import {
	getTurnEvents,
	subscribeTurnEvents,
	type TurnEvent,
} from "./turnEvents";

const LOG_STYLE: React.CSSProperties = {
	position: "absolute",
	top: 12,
	right: 12,
	width: 240,
	maxHeight: 200,
	overflowY: "auto",
	padding: "6px 10px",
	background: "rgba(3, 3, 8, 0.75)",
	border: "1px solid rgba(139, 230, 255, 0.15)",
	borderRadius: 4,
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: 10,
	color: "rgba(139, 230, 255, 0.7)",
	pointerEvents: "auto",
	lineHeight: 1.4,
};

const ENTRY_STYLE: React.CSSProperties = {
	padding: "2px 0",
	borderBottom: "1px solid rgba(139, 230, 255, 0.06)",
};

const TURN_STYLE: React.CSSProperties = {
	color: "rgba(139, 230, 255, 0.4)",
	fontSize: 9,
	marginRight: 4,
};

export function TurnLog() {
	const [events, setEvents] = useState<readonly TurnEvent[]>(getTurnEvents);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		return subscribeTurnEvents(() => {
			setEvents([...getTurnEvents()]);
		});
	}, []);

	// Auto-scroll to bottom on new events
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [events.length]);

	if (events.length === 0) return null;

	// Show last 30 events
	const visible = events.slice(-30);

	return (
		<div ref={scrollRef} style={LOG_STYLE} data-testid="turn-log">
			{visible.map((e, i) => (
				<div key={e.timestamp + i} style={ENTRY_STYLE}>
					<span style={TURN_STYLE}>T{e.turn}</span>
					{e.message}
				</div>
			))}
		</div>
	);
}
