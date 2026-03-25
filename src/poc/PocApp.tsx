/**
 * POC root — BabylonJS Engine + Scene via Reactylon.
 * Sets up default camera/light, fog, and physics.
 */

import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { Engine } from "reactylon/web";
import { Scene } from "reactylon";
import type { Scene as BScene } from "@babylonjs/core";
import { CityContent } from "./CityContent";

interface Props {
	havok: unknown;
}

function onSceneReady(scene: BScene) {
	scene.createDefaultCameraOrLight(true, undefined, true);
	scene.fogMode = 2;
	scene.fogDensity = 0.015;
	scene.fogColor.set(0.012, 0.027, 0.043);
	scene.clearColor.set(0.012, 0.027, 0.043, 1);
}

export function PocApp({ havok }: Props) {
	return (
		<Engine>
			<Scene
				onSceneReady={onSceneReady}
				physicsOptions={{ plugin: new HavokPlugin(true, havok) }}
			>
				<CityContent />
			</Scene>
		</Engine>
	);
}
