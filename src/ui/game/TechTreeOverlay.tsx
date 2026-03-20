/**
 * TechTreeOverlay — now redirects to BuildingProgressionOverlay.
 * Kept for backward compatibility with existing imports.
 */

import type { World } from "koota";
import { BuildingProgressionOverlay } from "./BuildingProgressionOverlay";

type TechTreeOverlayProps = {
	world: World;
	factionId: string;
	onClose: () => void;
};

export function TechTreeOverlay({
	world,
	factionId,
	onClose,
}: TechTreeOverlayProps) {
	return (
		<BuildingProgressionOverlay
			world={world}
			factionId={factionId}
			onClose={onClose}
		/>
	);
}
