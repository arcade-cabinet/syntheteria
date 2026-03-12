import { useProgress } from "@react-three/drei";
import { useEffect } from "react";

export function AssetLoadBeacon({
	onLoaded,
}: {
	onLoaded: () => void;
}) {
	const { active, loaded, total } = useProgress();

	useEffect(() => {
		if (!active && (total === 0 || loaded >= total)) {
			onLoaded();
		}
	}, [active, loaded, onLoaded, total]);

	return null;
}
