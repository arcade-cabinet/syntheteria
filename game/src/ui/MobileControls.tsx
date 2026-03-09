/**
 * Mobile controls overlay — combines all mobile-specific UI.
 *
 * Layout:
 * - Left: nipplejs movement joystick
 * - Bottom center: equipped tool view (tap to open radial menu)
 * - Right: action buttons (USE, E interact, Q switch bot)
 *
 * Only renders on touch devices.
 */

import { useCallback, useState } from "react";
import { ActionButtons, EquippedToolView } from "./EquippedToolView";
import { MobileJoystick } from "./MobileJoystick";
import { RadialToolMenu } from "./RadialToolMenu";

interface MobileControlsProps {
	onInteract: () => void;
	onSwitchBot: () => void;
	onPrimaryAction: () => void;
}

export function MobileControls({
	onInteract,
	onSwitchBot,
	onPrimaryAction,
}: MobileControlsProps) {
	const [radialOpen, setRadialOpen] = useState(false);

	const openRadial = useCallback(() => setRadialOpen(true), []);
	const closeRadial = useCallback(() => setRadialOpen(false), []);

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				zIndex: 15,
			}}
		>
			{/* Movement joystick — left side */}
			<MobileJoystick />

			{/* Equipped tool — bottom center */}
			<EquippedToolView onTap={openRadial} />

			{/* Action buttons — right side */}
			<ActionButtons
				onPrimaryAction={onPrimaryAction}
				onInteract={onInteract}
				onSwitchBot={onSwitchBot}
			/>

			{/* Radial menu overlay */}
			{radialOpen && <RadialToolMenu onClose={closeRadial} />}
		</div>
	);
}
