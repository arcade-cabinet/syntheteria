/**
 * Mobile controls overlay — combines all mobile-specific UI.
 *
 * Layout:
 * - Left: nipplejs movement joystick (bottom-left quadrant)
 * - Bottom center: equipped tool view (tap to open radial menu)
 * - Right: action buttons arranged for single-thumb access
 *   - Primary cluster (right thumb): Harvest, Compress, Grab/Drop
 *   - Secondary row: Interact (E), Switch Bot (Q)
 *
 * All elements respect safe area insets for notch/home indicator devices.
 * Touch targets are minimum 48x48px (exceeds WCAG 2.5.5 Level AAA).
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
	onHarvest: () => void;
	onCompress: () => void;
	onGrab: () => void;
}

export function MobileControls({
	onInteract,
	onSwitchBot,
	onPrimaryAction,
	onHarvest,
	onCompress,
	onGrab,
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
				/* Safe area padding applied to the container so children can use relative offsets */
				paddingLeft: "env(safe-area-inset-left, 0px)",
				paddingRight: "env(safe-area-inset-right, 0px)",
				paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
				onHarvest={onHarvest}
				onCompress={onCompress}
				onGrab={onGrab}
			/>

			{/* Radial menu overlay */}
			{radialOpen && <RadialToolMenu onClose={closeRadial} />}
		</div>
	);
}
