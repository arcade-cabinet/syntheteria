/**
 * UnifiedTerrainRenderer — legacy R3F title terrain (depth layers, ramps, walls).
 *
 * Depth layer stack rendering was removed; this component is a no-op stub until
 * the title scene is migrated off the old depth-mapped pipeline.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../../../board";

export type UnifiedTerrainRendererProps = {
	board: GeneratedBoard;
	world?: World;
	turn?: number;
};

export function UnifiedTerrainRenderer(_props: UnifiedTerrainRendererProps) {
	return null;
}
