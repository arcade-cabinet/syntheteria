/**
 * First-person camera attached to the active player bot.
 *
 * Desktop: Pointer lock for mouse look, WASD movement.
 * Mobile: Virtual joystick (left thumb) + touch-drag look (right side).
 *
 * The camera sits at eye height on the bot's worldPosition and rotates
 * based on the bot's playerControlled.yaw / pitch values.
 *
 * Movement uses building collision via isInsideBuilding() to prevent
 * walking through structures.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isInsideBuilding } from "../ecs/cityLayout";
import { getTerrainHeight } from "../ecs/terrain";
import { getActivePlayerBot, switchBot, switchBotTo } from "../ecs/world";
import { joystickState } from "../ui/MobileJoystick";

const EYE_HEIGHT = 1.4;
const MOVE_SPEED = 5.0;
const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.004;
const PITCH_LIMIT = Math.PI * 0.45; // ~81 degrees up/down

export function FPSCamera() {
	const { camera, gl } = useThree();
	const keys = useRef(new Set<string>());
	const isPointerLocked = useRef(false);

	// Touch look state (right side of screen)
	const touchLook = useRef<{
		id: number;
		lastX: number;
		lastY: number;
	} | null>(null);

	// Touch move state (left side of screen)
	const touchMove = useRef<{
		id: number;
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
	} | null>(null);

	// --- Pointer lock (desktop) ---
	useEffect(() => {
		const canvas = gl.domElement;

		const onClick = () => {
			if (!isPointerLocked.current) {
				canvas.requestPointerLock();
			}
		};

		const onPointerLockChange = () => {
			isPointerLocked.current = document.pointerLockElement === canvas;
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!isPointerLocked.current) return;
			const bot = getActivePlayerBot();
			if (!bot) return;

			bot.playerControlled.yaw -= e.movementX * MOUSE_SENSITIVITY;
			bot.playerControlled.pitch = Math.max(
				-PITCH_LIMIT,
				Math.min(
					PITCH_LIMIT,
					bot.playerControlled.pitch - e.movementY * MOUSE_SENSITIVITY,
				),
			);
		};

		canvas.addEventListener("click", onClick);
		document.addEventListener("pointerlockchange", onPointerLockChange);
		document.addEventListener("mousemove", onMouseMove);

		return () => {
			canvas.removeEventListener("click", onClick);
			document.removeEventListener("pointerlockchange", onPointerLockChange);
			document.removeEventListener("mousemove", onMouseMove);
		};
	}, [gl]);

	// --- Keyboard + bot-switch event ---
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			keys.current.add(e.key.toLowerCase());
			// Q to cycle through player bots
			if (e.key.toLowerCase() === "q") {
				switchBot();
			}
		};
		const onKeyUp = (e: KeyboardEvent) =>
			keys.current.delete(e.key.toLowerCase());

		// Listen for contextual interaction menu "switch" action
		const onSwitchBot = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.entityId) {
				switchBotTo(detail.entityId);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("coreloop:switch-bot", onSwitchBot);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("coreloop:switch-bot", onSwitchBot);
		};
	}, []);

	// --- Touch controls (mobile) ---
	useEffect(() => {
		const canvas = gl.domElement;
		const halfW = () => window.innerWidth / 2;

		const onTouchStart = (e: TouchEvent) => {
			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i];
				if (t.clientX < halfW()) {
					// Left side = movement
					touchMove.current = {
						id: t.identifier,
						startX: t.clientX,
						startY: t.clientY,
						currentX: t.clientX,
						currentY: t.clientY,
					};
				} else {
					// Right side = look
					touchLook.current = {
						id: t.identifier,
						lastX: t.clientX,
						lastY: t.clientY,
					};
				}
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			const bot = getActivePlayerBot();
			if (!bot) return;

			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i];

				if (touchLook.current && t.identifier === touchLook.current.id) {
					const dx = t.clientX - touchLook.current.lastX;
					const dy = t.clientY - touchLook.current.lastY;
					bot.playerControlled.yaw -= dx * TOUCH_SENSITIVITY;
					bot.playerControlled.pitch = Math.max(
						-PITCH_LIMIT,
						Math.min(
							PITCH_LIMIT,
							bot.playerControlled.pitch - dy * TOUCH_SENSITIVITY,
						),
					);
					touchLook.current.lastX = t.clientX;
					touchLook.current.lastY = t.clientY;
				}

				if (touchMove.current && t.identifier === touchMove.current.id) {
					touchMove.current.currentX = t.clientX;
					touchMove.current.currentY = t.clientY;
				}
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i];
				if (touchLook.current && t.identifier === touchLook.current.id) {
					touchLook.current = null;
				}
				if (touchMove.current && t.identifier === touchMove.current.id) {
					touchMove.current = null;
				}
			}
		};

		canvas.addEventListener("touchstart", onTouchStart, { passive: false });
		canvas.addEventListener("touchmove", onTouchMove, { passive: false });
		canvas.addEventListener("touchend", onTouchEnd);

		return () => {
			canvas.removeEventListener("touchstart", onTouchStart);
			canvas.removeEventListener("touchmove", onTouchMove);
			canvas.removeEventListener("touchend", onTouchEnd);
		};
	}, [gl]);

	// --- Per-frame update ---
	useFrame((_, delta) => {
		const bot = getActivePlayerBot();
		if (!bot) return;

		const { yaw, pitch } = bot.playerControlled;
		const wp = bot.worldPosition;

		// --- Movement from keyboard ---
		const k = keys.current;
		let moveX = 0;
		let moveZ = 0;

		if (k.has("w") || k.has("arrowup")) moveZ -= 1;
		if (k.has("s") || k.has("arrowdown")) moveZ += 1;
		if (k.has("a") || k.has("arrowleft")) moveX -= 1;
		if (k.has("d") || k.has("arrowright")) moveX += 1;

		// --- Movement from nipplejs joystick (mobile) ---
		if (joystickState.active) {
			moveX += joystickState.moveX;
			moveZ += joystickState.moveZ;
		}

		// --- Movement from raw touch (fallback if nipplejs not active) ---
		if (!joystickState.active && touchMove.current) {
			const tm = touchMove.current;
			const dx = tm.currentX - tm.startX;
			const dy = tm.currentY - tm.startY;
			const deadzone = 15;
			const maxDist = 80;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > deadzone) {
				const scale = Math.min(1, (dist - deadzone) / (maxDist - deadzone));
				moveX += (dx / dist) * scale;
				moveZ += (dy / dist) * scale;
			}
		}

		// Apply movement in view direction (yaw only, no flying)
		if (moveX !== 0 || moveZ !== 0) {
			const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
			if (len > 1) {
				moveX /= len;
				moveZ /= len;
			}

			const speed = MOVE_SPEED * delta;
			const sinYaw = Math.sin(yaw);
			const cosYaw = Math.cos(yaw);

			// Forward is -Z in local space, map to world via yaw
			const worldMoveX = moveX * cosYaw - moveZ * sinYaw;
			const worldMoveZ = moveX * sinYaw + moveZ * cosYaw;

			const newX = wp.x + worldMoveX * speed;
			const newZ = wp.z + worldMoveZ * speed;

			// Building collision — try full move, then slide along axes
			if (!isInsideBuilding(newX, newZ)) {
				wp.x = newX;
				wp.z = newZ;
			} else if (!isInsideBuilding(newX, wp.z)) {
				wp.x = newX;
			} else if (!isInsideBuilding(wp.x, newZ)) {
				wp.z = newZ;
			}
			// else: blocked on both axes, don't move

			wp.y = getTerrainHeight(wp.x, wp.z);
		}

		// --- Update camera position and rotation ---
		camera.position.set(wp.x, wp.y + EYE_HEIGHT, wp.z);

		// Build rotation from yaw + pitch
		const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
		camera.quaternion.setFromEuler(euler);
	});

	return null;
}
