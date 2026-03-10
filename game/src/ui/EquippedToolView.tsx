/**
 * Equipped tool "held" view -- bottom center of viewport.
 *
 * Shows a procedurally generated representation of the currently
 * equipped tool, like a first-person weapon/tool view.
 * Tapping it opens the radial tool menu.
 *
 * Also includes action buttons on the right side for mobile:
 * - Primary cluster: Harvest (F), Compress (C), Grab (G) -- core loop actions
 * - Secondary buttons: Interact (E), Switch Bot (Q)
 *
 * All touch targets meet WCAG 2.5.5 minimum (48x48px).
 * Safe area insets are handled by the parent MobileControls container.
 */

import { useEffect, useState } from "react";
import {
	getEquippedTool,
	subscribeToolChange,
	type ToolType,
} from "./RadialToolMenu";

const TOOL_VISUALS: Record<
	ToolType,
	{ color: string; shape: string; label: string }
> = {
	scanner: { color: "#00ffaa", shape: "\u25ce", label: "SCANNER" },
	repair: { color: "#44aaff", shape: "\u2699", label: "REPAIR ARM" },
	welder: { color: "#ffaa00", shape: "\u26a1", label: "WELDER" },
	fabricate: { color: "#aa44ff", shape: "\u2b21", label: "FABRICATOR" },
	build: { color: "#44ff88", shape: "\u25a6", label: "BUILDER" },
	scavenge: { color: "#ff8844", shape: "\u25c8", label: "SALVAGER" },
};

interface EquippedToolViewProps {
	onTap: () => void;
}

export function EquippedToolView({ onTap }: EquippedToolViewProps) {
	const [tool, setTool] = useState(getEquippedTool());

	useEffect(() => {
		return subscribeToolChange(() => setTool(getEquippedTool()));
	}, []);

	const visual = TOOL_VISUALS[tool];

	return (
		<div
			onClick={onTap}
			style={{
				position: "absolute",
				bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				width: "80px",
				height: "80px",
				borderRadius: "50%",
				background: "rgba(0, 8, 4, 0.8)",
				border: `2px solid ${visual.color}44`,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				pointerEvents: "auto",
				boxShadow: `0 0 16px ${visual.color}22, inset 0 0 12px ${visual.color}11`,
				zIndex: 20,
			}}
		>
			<span style={{ fontSize: "28px", lineHeight: 1 }}>{visual.shape}</span>
			<span
				style={{
					color: visual.color,
					fontSize: "7px",
					fontFamily: "'Courier New', monospace",
					letterSpacing: "0.1em",
					marginTop: "2px",
				}}
			>
				{visual.label}
			</span>
		</div>
	);
}

/**
 * Right-side action buttons for mobile FPS.
 *
 * Layout (right-thumb reachable, bottom-up):
 *
 *        [Q]  [E]        <-- secondary row, top
 *     [GRAB]  [USE]      <-- middle row
 *   [COMPRESS] [HARVEST] <-- primary cluster, bottom (most-used actions)
 *
 * Harvest and Compress are the most frequent core loop actions and sit
 * at the bottom-right where the right thumb naturally rests.
 * Grab/Drop is just above since it alternates with harvest flow.
 */
export function ActionButtons({
	onPrimaryAction,
	onInteract,
	onSwitchBot,
	onHarvest,
	onCompress,
	onGrab,
}: {
	onPrimaryAction: () => void;
	onInteract: () => void;
	onSwitchBot: () => void;
	onHarvest: () => void;
	onCompress: () => void;
	onGrab: () => void;
}) {
	return (
		<div
			style={{
				position: "absolute",
				right: "max(16px, env(safe-area-inset-right, 0px))",
				bottom: "max(20px, env(safe-area-inset-bottom, 0px))",
				display: "flex",
				flexDirection: "column",
				alignItems: "flex-end",
				gap: "12px",
				pointerEvents: "auto",
				zIndex: 20,
			}}
		>
			{/* Secondary row -- top (less frequent) */}
			<div style={{ display: "flex", gap: "12px" }}>
				<ActionBtn
					label="Q"
					sublabel="BOT"
					color="#ffaa44"
					size={48}
					onPress={onSwitchBot}
				/>
				<ActionBtn
					label="E"
					sublabel="ACT"
					color="#44aaff"
					size={48}
					onPress={onInteract}
				/>
			</div>

			{/* Middle row -- grab + use */}
			<div style={{ display: "flex", gap: "12px" }}>
				<ActionBtn
					label="G"
					sublabel="GRAB"
					color="#88ddff"
					size={52}
					onPress={onGrab}
				/>
				<ActionBtn
					label="USE"
					sublabel=""
					color="#00ffaa"
					size={56}
					onPress={onPrimaryAction}
				/>
			</div>

			{/* Primary cluster -- bottom (most-used core loop) */}
			<div style={{ display: "flex", gap: "12px" }}>
				<ActionBtn
					label="C"
					sublabel="PRESS"
					color="#ff6644"
					size={56}
					onPress={onCompress}
				/>
				<ActionBtn
					label="F"
					sublabel="MINE"
					color="#ffcc00"
					size={56}
					onPress={onHarvest}
				/>
			</div>
		</div>
	);
}

function ActionBtn({
	label,
	sublabel,
	color,
	size,
	onPress,
}: {
	label: string;
	sublabel: string;
	color: string;
	size: number;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			onPointerDown={(e) => {
				e.preventDefault();
				onPress();
			}}
			style={{
				width: Math.max(size, 48),
				height: Math.max(size, 48),
				borderRadius: "50%",
				background: "rgba(0, 8, 4, 0.75)",
				border: `2px solid ${color}66`,
				color,
				fontSize: size >= 52 ? "14px" : "12px",
				fontFamily: "'Courier New', monospace",
				fontWeight: "bold",
				letterSpacing: "0.05em",
				cursor: "pointer",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				boxShadow: `0 0 10px ${color}22`,
				padding: 0,
				/* Prevent text selection on rapid taps */
				WebkitUserSelect: "none",
				userSelect: "none",
				/* Prevent touch callout on iOS */
				WebkitTouchCallout: "none",
			}}
		>
			<span style={{ lineHeight: 1 }}>{label}</span>
			{sublabel && (
				<span
					style={{
						fontSize: "6px",
						opacity: 0.7,
						letterSpacing: "0.08em",
						marginTop: "1px",
						lineHeight: 1,
					}}
				>
					{sublabel}
				</span>
			)}
		</button>
	);
}
