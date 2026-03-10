/**
 * Mobile virtual joystick using nipplejs.
 *
 * Left side: movement joystick (feeds into FPSCamera movement).
 * The joystick exports its current vector so the camera system can read it.
 *
 * The right side of the screen is left free for touch-drag look controls
 * (handled by FPSCamera's existing touch look system).
 *
 * Joystick size is 120px (up from 100) for better thumb control.
 * Position accounts for safe area insets on notched devices.
 */

import nipplejs from "nipplejs";
import { useEffect, useRef } from "react";

/** Global joystick movement state -- read by FPSCamera each frame */
export const joystickState = {
	moveX: 0,
	moveZ: 0,
	active: false,
};

/**
 * Joystick sizing -- 120px gives a comfortable thumb range on phones
 * (5-6 inch screens). The static position is offset from the bottom-left
 * corner to clear both the safe area and the natural thumb resting point.
 */
const JOYSTICK_SIZE = 120;

export function MobileJoystick() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		// Read safe area inset so the joystick center clears the home indicator
		const safeBottom = Number.parseInt(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--sab",
			) || "0",
			10,
		);
		const safeLeft = Number.parseInt(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--sal",
			) || "0",
			10,
		);

		const bottomOffset = Math.max(72, safeBottom + 48);
		const leftOffset = Math.max(72, safeLeft + 48);

		const manager = nipplejs.create({
			zone: containerRef.current,
			mode: "static",
			position: {
				left: `${leftOffset}px`,
				bottom: `${bottomOffset}px`,
			},
			size: JOYSTICK_SIZE,
			color: "#00ffaa44",
			restOpacity: 0.4,
		});

		manager.on("move", (_, data) => {
			if (!data.vector) return;
			// nipplejs gives x/y where x=right, y=up
			// We want moveX=right, moveZ=forward(up on screen = forward in world)
			const force = Math.min(1, (data.force ?? 0) / 2);
			joystickState.moveX = data.vector.x * force;
			joystickState.moveZ = -data.vector.y * force; // negative because forward is -Z in screen coords
			joystickState.active = true;
		});

		manager.on("end", () => {
			joystickState.moveX = 0;
			joystickState.moveZ = 0;
			joystickState.active = false;
		});

		return () => {
			manager.destroy();
			joystickState.moveX = 0;
			joystickState.moveZ = 0;
			joystickState.active = false;
		};
	}, []);

	return (
		<div
			ref={containerRef}
			style={{
				position: "absolute",
				left: 0,
				bottom: 0,
				width: "40%",
				height: "50%",
				zIndex: 10,
				pointerEvents: "auto",
				/* Prevent accidental text selection or callouts while dragging */
				WebkitUserSelect: "none",
				userSelect: "none",
				WebkitTouchCallout: "none",
			}}
		/>
	);
}
