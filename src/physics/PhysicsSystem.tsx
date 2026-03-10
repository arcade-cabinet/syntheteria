/**
 * R3F component that initializes and steps the Rapier physics world.
 *
 * - Initializes Rapier WASM on mount
 * - Creates ground plane and building colliders
 * - Steps physics each frame
 * - Syncs player bot position with kinematic body
 */

import type RAPIER from "@dimforge/rapier3d-compat";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getCityBuildings } from "../ecs/cityLayout";
import { getActivePlayerBot } from "../ecs/world";
import {
	addGroundPlane,
	addKinematicBody,
	addStaticBox,
	initPhysics,
	isPhysicsInitialized,
	stepPhysics,
} from "./PhysicsWorld";

export function PhysicsSystem() {
	const playerBody = useRef<RAPIER.RigidBody | null>(null);
	const initDone = useRef(false);

	useEffect(() => {
		let cancelled = false;

		async function setup() {
			await initPhysics();
			if (cancelled) return;

			// Ground plane
			addGroundPlane(0);

			// Add building colliders
			const buildings = getCityBuildings();
			for (const b of buildings) {
				const halfH = b.height / 2;
				addStaticBox(b.x, halfH, b.z, b.halfW, halfH, b.halfD);
			}

			// Player kinematic body
			const bot = getActivePlayerBot();
			if (bot) {
				playerBody.current = addKinematicBody(
					bot.worldPosition.x,
					bot.worldPosition.y,
					bot.worldPosition.z,
				);
			}

			initDone.current = true;
		}

		setup();

		return () => {
			cancelled = true;
		};
	}, []);

	useFrame(() => {
		if (!initDone.current || !isPhysicsInitialized()) return;

		// Sync player bot position to kinematic body
		const bot = getActivePlayerBot();
		if (bot && playerBody.current) {
			playerBody.current.setNextKinematicTranslation({
				x: bot.worldPosition.x,
				y: bot.worldPosition.y,
				z: bot.worldPosition.z,
			});
		}

		stepPhysics();
	});

	return null;
}
