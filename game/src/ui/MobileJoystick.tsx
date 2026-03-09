/**
 * Mobile virtual joystick using nipplejs.
 *
 * Left side: movement joystick (feeds into FPSCamera movement).
 * The joystick exports its current vector so the camera system can read it.
 *
 * The right side of the screen is left free for touch-drag look controls
 * (handled by FPSCamera's existing touch look system).
 */

import nipplejs from "nipplejs";
import { useEffect, useRef } from "react";

/** Global joystick movement state — read by FPSCamera each frame */
export const joystickState = {
	moveX: 0,
	moveZ: 0,
	active: false,
};

export function MobileJoystick() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const manager = nipplejs.create({
			zone: containerRef.current,
			mode: "static",
			position: { left: "64px", bottom: "64px" },
			size: 100,
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
			}}
		/>
	);
}
