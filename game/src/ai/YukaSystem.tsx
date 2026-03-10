/**
 * YukaSystem — R3F component that drives the Yuka update loop.
 *
 * Renders nothing. Calls YukaManager.update() each frame with the
 * delta time from useFrame, keeping Yuka in sync with Three.js.
 *
 * Place this component inside the <Canvas> element, alongside <GameLoop>.
 */

import { useFrame } from "@react-three/fiber";
import { YukaManager } from "./YukaManager.ts";

export function YukaSystem() {
	useFrame((_, delta) => {
		YukaManager.update(delta);
	});

	return null;
}
