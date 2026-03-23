/**
 * Presentational "in-world" readout chip for HUD. Used by GameHUDDom and
 * any DOM surface that needs diegetic-style label + value.
 */
export function DiegeticChip({
	label,
	value,
	valueColor = "#d9fff3",
}: {
	label: string;
	value: string | number;
	valueColor?: string;
}) {
	return (
		<div
			data-testid="diegetic-chip"
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				padding: "4px 8px",
				borderRadius: 8,
				background: "rgba(7, 17, 23, 0.9)",
				color: "#fff",
				fontFamily: "monospace",
				fontSize: 12,
			}}
		>
			<span
				style={{
					color: "rgba(255,255,255,0.5)",
					textTransform: "uppercase",
					letterSpacing: "0.1em",
				}}
			>
				{label}
			</span>
			<span style={{ color: valueColor }}>{String(value)}</span>
		</div>
	);
}
