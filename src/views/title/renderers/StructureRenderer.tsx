/**
 * StructureRenderer — legacy R3F globe/title structures (walls, columns, roofs).
 *
 * Labyrinth structure helpers were removed; this component is retained as a
 * no-op stub until the title scene is migrated.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../../../board";

export type StructureRendererProps = {
	board: GeneratedBoard;
	world?: World;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

export function StructureRenderer(_props: StructureRendererProps) {
	return null;
}
