import { Clone, useGLTF } from "@react-three/drei";
import { resolveAssetUri } from "../../config/assetUri";
import type { CityModelDefinition } from "../config/types";

function fitScale(model: CityModelDefinition, targetSpan: number) {
	const span = Math.max(model.bounds.width, model.bounds.depth, 0.25);
	return (targetSpan / span) * model.defaultScale;
}

export function CityModelMesh({
	model,
	targetSpan,
}: {
	model: CityModelDefinition;
	targetSpan: number;
}) {
	const { scene } = useGLTF(resolveAssetUri(model.sourceAsset));
	return <Clone object={scene} scale={fitScale(model, targetSpan)} />;
}
