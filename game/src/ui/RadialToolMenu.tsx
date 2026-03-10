/**
 * Radial tool menu — opens when player taps the equipped tool indicator.
 *
 * Shows available tools in a radial SVG layout around the center point.
 * Each tool is a wedge/icon arranged in a circle.
 *
 * Tools: Scanner, Repair Arm, Welder, Fabricate, Build, Scavenge
 */

export type ToolType =
	| "scanner"
	| "repair"
	| "welder"
	| "fabricate"
	| "build"
	| "scavenge";

interface Tool {
	id: ToolType;
	label: string;
	icon: string; // SVG path or simple glyph
	color: string;
}

const TOOLS: Tool[] = [
	{ id: "scanner", label: "SCAN", icon: "◎", color: "#00ffaa" },
	{ id: "repair", label: "REPAIR", icon: "⚙", color: "#44aaff" },
	{ id: "welder", label: "WELD", icon: "⚡", color: "#ffaa00" },
	{ id: "fabricate", label: "FAB", icon: "⬡", color: "#aa44ff" },
	{ id: "build", label: "BUILD", icon: "▦", color: "#44ff88" },
	{ id: "scavenge", label: "SALVAGE", icon: "◈", color: "#ff8844" },
];

/** Global equipped tool state */
let currentTool: ToolType = "scanner";
const toolListeners: Set<() => void> = new Set();

export function getEquippedTool(): ToolType {
	return currentTool;
}

export function setEquippedTool(tool: ToolType) {
	currentTool = tool;
	toolListeners.forEach((fn) => fn());
}

export function subscribeToolChange(fn: () => void) {
	toolListeners.add(fn);
	return () => {
		toolListeners.delete(fn);
	};
}

interface RadialToolMenuProps {
	onClose: () => void;
}

export function RadialToolMenu({ onClose }: RadialToolMenuProps) {
	// Increased radius and item sizes for comfortable touch targets.
	// Each tool circle is r=32 (64px diameter), exceeding WCAG 48px minimum.
	const radius = 100;
	const svgSize = 340;
	const centerX = svgSize / 2;
	const centerY = svgSize / 2;

	const handleSelect = (tool: Tool) => {
		setEquippedTool(tool.id);
		onClose();
	};

	return (
		<div
			style={{
				position: "absolute",
				bottom: `max(60px, env(safe-area-inset-bottom, 0px))`,
				left: "50%",
				transform: "translateX(-50%)",
				width: `${svgSize}px`,
				height: `${svgSize}px`,
				zIndex: 50,
				pointerEvents: "auto",
			}}
			onClick={(e) => {
				// Click outside tools = close
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<svg
				width={svgSize}
				height={svgSize}
				viewBox={`0 0 ${svgSize} ${svgSize}`}
			>
				{/* Background circle */}
				<circle
					cx={centerX}
					cy={centerY}
					r={radius + 40}
					fill="rgba(0, 8, 4, 0.9)"
					stroke="#00ffaa33"
					strokeWidth="1"
				/>

				{/* Tool items arranged radially */}
				{TOOLS.map((tool, i) => {
					const angle = (i / TOOLS.length) * Math.PI * 2 - Math.PI / 2;
					const x = centerX + Math.cos(angle) * radius;
					const y = centerY + Math.sin(angle) * radius;
					const isActive = currentTool === tool.id;

					return (
						<g
							key={tool.id}
							onClick={() => handleSelect(tool)}
							style={{ cursor: "pointer" }}
						>
							{/* Hit area -- r=32 gives 64px diameter touch target */}
							<circle
								cx={x}
								cy={y}
								r={32}
								fill={isActive ? `${tool.color}22` : "rgba(0,0,0,0.4)"}
								stroke={isActive ? tool.color : "#00ffaa44"}
								strokeWidth={isActive ? 2 : 1}
							/>
							{/* Icon */}
							<text
								x={x}
								y={y - 5}
								textAnchor="middle"
								dominantBaseline="central"
								fill={tool.color}
								fontSize="20"
							>
								{tool.icon}
							</text>
							{/* Label */}
							<text
								x={x}
								y={y + 15}
								textAnchor="middle"
								fill={isActive ? tool.color : "#00ffaa88"}
								fontSize="9"
								fontFamily="'Courier New', monospace"
								letterSpacing="0.05em"
							>
								{tool.label}
							</text>
						</g>
					);
				})}

				{/* Center -- current tool */}
				<circle
					cx={centerX}
					cy={centerY}
					r={22}
					fill="rgba(0,8,4,0.9)"
					stroke="#00ffaa44"
					strokeWidth="1"
				/>
				<text
					x={centerX}
					y={centerY}
					textAnchor="middle"
					dominantBaseline="central"
					fill="#00ffaa"
					fontSize="9"
					fontFamily="'Courier New', monospace"
				>
					{currentTool.toUpperCase()}
				</text>
			</svg>
		</div>
	);
}
