/**
 * Flashlight — a SpotLight attached to the camera.
 *
 * Toggle with F key. Requires a functional power_cell component on the
 * active player bot. When the power cell is damaged the light flickers
 * with random intensity variation.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { hasFunctionalComponent } from "../ecs/types";
import { getActivePlayerBot } from "../ecs/world";

const LIGHT_COLOR = 0xffffee;
const LIGHT_ANGLE = 0.5; // radians
const LIGHT_PENUMBRA = 0.3;
const LIGHT_INTENSITY = 2;
const LIGHT_DISTANCE = 20;

export function Flashlight() {
	const { scene, camera } = useThree();
	const [enabled, setEnabled] = useState(false);
	const lightRef = useRef<THREE.SpotLight | null>(null);
	const targetRef = useRef<THREE.Object3D | null>(null);

	// Create light + target once
	useEffect(() => {
		const light = new THREE.SpotLight(
			LIGHT_COLOR,
			0, // start off
			LIGHT_DISTANCE,
			LIGHT_ANGLE,
			LIGHT_PENUMBRA,
		);
		const target = new THREE.Object3D();

		scene.add(light);
		scene.add(target);
		light.target = target;

		lightRef.current = light;
		targetRef.current = target;

		return () => {
			scene.remove(light);
			scene.remove(target);
			light.dispose();
			lightRef.current = null;
			targetRef.current = null;
		};
	}, [scene]);

	// F key toggle
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "f") {
				setEnabled((prev) => !prev);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Per-frame: position light at camera, aim forward, handle flicker
	useFrame(() => {
		const light = lightRef.current;
		const target = targetRef.current;
		if (!light || !target) return;

		const bot = getActivePlayerBot();

		// Determine if we have power
		const hasPower = bot
			? hasFunctionalComponent(bot.unit.components, "power_cell")
			: false;
		const powerCellExists = bot
			? bot.unit.components.some((c) => c.name === "power_cell")
			: false;
		const powerCellDamaged = powerCellExists && !hasPower;

		// Light is on only if enabled AND we have a power cell (even if damaged)
		const isOn = enabled && powerCellExists;

		if (!isOn) {
			light.intensity = 0;
			return;
		}

		// Position at camera
		light.position.copy(camera.position);

		// Aim in camera direction
		const forward = new THREE.Vector3(0, 0, -1);
		forward.applyQuaternion(camera.quaternion);
		target.position.copy(camera.position).add(forward.multiplyScalar(10));

		// Intensity — flicker if damaged
		if (powerCellDamaged) {
			// Random flicker
			const flicker = 0.3 + Math.random() * 1.7;
			light.intensity = flicker;
		} else {
			light.intensity = LIGHT_INTENSITY;
		}
	});

	return null;
}
