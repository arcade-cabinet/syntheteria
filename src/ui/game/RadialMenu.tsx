/**
 * RadialMenu — DOM overlay for unit actions.
 *
 * Appears when a selected player unit is right-clicked (or long-pressed on mobile).
 * Displays contextual actions based on unit state and nearby buildings.
 */

import type { Entity } from "koota";
import { useCallback, useEffect, useState } from "react";
import {
	getUpgradeCost,
	MAX_MARK,
	ROBOT_DEFS,
	type RobotType,
} from "../../config/robotDefs";
import { EngagementRule, Position, ScavengeSite, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import { canUpgrade, performUpgrade } from "../../systems/upgrade";

export interface RadialMenuProps {
	entity: Entity;
	screenX: number;
	screenY: number;
	onClose: () => void;
}

interface MenuAction {
	label: string;
	enabled: boolean;
	tooltip: string;
	onClick: () => void;
}

function getActions(entity: Entity, onClose: () => void): MenuAction[] {
	const unit = entity.get(Unit);
	if (!unit) return [];
	const pos = entity.get(Position);
	if (!pos) return [];

	const actions: MenuAction[] = [];

	// Move
	if (unit.speed > 0) {
		actions.push({
			label: "MOVE",
			enabled: true,
			tooltip: "Right-click ground to move",
			onClick: onClose,
		});
	}

	// Attack
	if (unit.speed > 0) {
		actions.push({
			label: "ATTACK",
			enabled: true,
			tooltip: "Right-click enemy to attack",
			onClick: onClose,
		});
	}

	// Upgrade
	if (unit.mark < MAX_MARK) {
		const costs = getUpgradeCost(unit.unitType, unit.mark);
		const upgradePossible = canUpgrade(entity) !== null;
		const costText = costs
			? costs.map((c) => `${c.amount} ${c.type}`).join(", ")
			: "";
		actions.push({
			label: `UPGRADE (Mk${unit.mark + 1})`,
			enabled: upgradePossible,
			tooltip: upgradePossible
				? `Upgrade to Mark ${unit.mark + 1}: ${costText}`
				: costs
					? `Need: ${costText} (at powered fab)`
					: "Max mark reached",
			onClick: () => {
				performUpgrade(entity);
				onClose();
			},
		});
	}

	// Engagement rule cycle
	if (entity.has(EngagementRule)) {
		const current = entity.get(EngagementRule)!.value;
		const rules = ["attack", "flee", "protect", "hold"] as const;
		const nextIdx = (rules.indexOf(current) + 1) % rules.length;
		const next = rules[nextIdx];
		actions.push({
			label: `STANCE: ${current.toUpperCase()}`,
			enabled: true,
			tooltip: `Click to switch to ${next}`,
			onClick: () => {
				entity.set(EngagementRule, { value: next });
				onClose();
			},
		});
	}

	// Scavenge — show if near a scavenge site
	let nearScavenge = false;
	for (const site of world.query(Position, ScavengeSite)) {
		const siteData = site.get(ScavengeSite)!;
		if (siteData.remaining <= 0) continue;
		const sPos = site.get(Position)!;
		const dx = sPos.x - pos.x;
		const dz = sPos.z - pos.z;
		if (Math.sqrt(dx * dx + dz * dz) <= 3.0) {
			nearScavenge = true;
			break;
		}
	}
	if (nearScavenge) {
		actions.push({
			label: "SCAVENGE",
			enabled: true,
			tooltip: "Auto-scavenge nearby resources",
			onClick: onClose,
		});
	}

	return actions;
}

const MENU_RADIUS = 60;

export function RadialMenu({
	entity,
	screenX,
	screenY,
	onClose,
}: RadialMenuProps) {
	const [actions, setActions] = useState<MenuAction[]>([]);

	useEffect(() => {
		setActions(getActions(entity, onClose));
	}, [entity, onClose]);

	// Close on Escape
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	// Close on click outside
	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) onClose();
		},
		[onClose],
	);

	if (actions.length === 0) return null;

	const unit = entity.get(Unit);
	const robotDef = unit ? ROBOT_DEFS[unit.unitType as RobotType] : null;

	return (
		<button
			type="button"
			tabIndex={-1}
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 300,
				pointerEvents: "auto",
				background: "none",
				border: "none",
				padding: 0,
				margin: 0,
				cursor: "default",
				display: "block",
				width: "100%",
				height: "100%",
			}}
		>
			{/* Center label */}
			<div
				style={{
					position: "absolute",
					left: screenX,
					top: screenY,
					transform: "translate(-50%, -50%)",
					fontFamily: "'Courier New', monospace",
					fontSize: "10px",
					color: "#00ffaa88",
					textAlign: "center",
					pointerEvents: "none",
					letterSpacing: "0.1em",
				}}
			>
				{unit?.displayName}
				{robotDef && (
					<div style={{ fontSize: "9px", color: "#00ffaa55" }}>
						{robotDef.marks[(unit?.mark ?? 1) - 1]?.label}
					</div>
				)}
			</div>

			{/* Action buttons arranged in a circle */}
			{actions.map((action, i) => {
				const angle = (i / actions.length) * Math.PI * 2 - Math.PI / 2;
				const x = screenX + Math.cos(angle) * MENU_RADIUS;
				const y = screenY + Math.sin(angle) * MENU_RADIUS;

				return (
					<button
						key={action.label}
						type="button"
						onClick={action.enabled ? action.onClick : undefined}
						title={action.tooltip}
						style={{
							position: "absolute",
							left: x,
							top: y,
							transform: "translate(-50%, -50%)",
							background: action.enabled
								? "rgba(0,0,0,0.85)"
								: "rgba(0,0,0,0.6)",
							color: action.enabled ? "#00ffaa" : "#00ffaa44",
							border: action.enabled
								? "1px solid #00ffaa88"
								: "1px solid #00ffaa22",
							borderRadius: "6px",
							padding: "6px 10px",
							fontSize: "10px",
							fontFamily: "'Courier New', monospace",
							letterSpacing: "0.1em",
							cursor: action.enabled ? "pointer" : "default",
							whiteSpace: "nowrap",
							pointerEvents: "auto",
						}}
					>
						{action.label}
					</button>
				);
			})}
		</button>
	);
}
