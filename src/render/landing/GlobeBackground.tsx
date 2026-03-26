import { useEffect } from "react";
import { Scene, useScene } from "reactylon";
import { Engine } from "reactylon/web";
import {
	configureLandingScene,
	registerLandingShaders,
	setupLandingScene,
} from "./scene";

registerLandingShaders();

function GlobeSceneContent() {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;
		return setupLandingScene(scene);
	}, [scene]);

	return null;
}

export function GlobeBackground() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 100,
			}}
		>
			<Engine>
				<Scene onSceneReady={configureLandingScene}>
					<GlobeSceneContent />
				</Scene>
			</Engine>
		</div>
	);
}
