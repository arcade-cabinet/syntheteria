/**
 * KeybindHints — small bottom-left overlay showing available keyboard shortcuts.
 *
 * Only shown on desktop (non-touch) devices.
 * Compact, semi-transparent, doesn't block gameplay.
 */

function Hint({ keys, label }: { keys: string; label: string }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
			}}
		>
			<div
				style={{
					paddingLeft: 5,
					paddingRight: 5,
					paddingTop: 2,
					paddingBottom: 2,
					borderRadius: 4,
					border: "1px solid rgba(139, 230, 255, 0.2)",
					backgroundColor: "rgba(139, 230, 255, 0.06)",
					minWidth: 22,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						color: "#8be6ff",
						fontWeight: "600",
					}}
				>
					{keys}
				</span>
			</div>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 9,
					color: "rgba(255, 255, 255, 0.4)",
					letterSpacing: 0.5,
				}}
			>
				{label}
			</span>
		</div>
	);
}

export function KeybindHints() {
	const width = window.innerWidth;

	// Only show on desktop-width screens
	if (width < 768) return null;

	return (
		<div
			data-testid="keybind-hints"
			style={{
				position: "absolute",
				left: 12,
				bottom: 12,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				pointerEvents: "none",
				opacity: 0.7,
			}}
		>
			<Hint keys="Tab" label="Cycle units" />
			<Hint keys="Enter" label="End turn" />
			<Hint keys="Esc" label="Cancel" />
			<Hint keys="WASD" label="Pan camera" />
			<Hint keys="Z" label="Zoom" />
		</div>
	);
}
