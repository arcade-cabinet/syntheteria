import { type ComponentProps, useMemo } from "react";
import { getCityModelById } from "../catalog/cityCatalog";
import type { CityLayoutScenario } from "../config/types";
import { CityModelMesh } from "./CityModelMesh";

type GroupProps = ComponentProps<"group">;

function edgeOffset(
	cellSize: number,
	edge: "north" | "east" | "south" | "west" | undefined,
) {
	switch (edge) {
		case "north":
			return { x: 0, z: -cellSize * 0.48 };
		case "east":
			return { x: cellSize * 0.48, z: 0 };
		case "south":
			return { x: 0, z: cellSize * 0.48 };
		case "west":
			return { x: -cellSize * 0.48, z: 0 };
		default:
			return { x: 0, z: 0 };
	}
}

export function CityAssemblyRenderer({
	scenario,
	...props
}: GroupProps & {
	scenario: CityLayoutScenario;
}) {
	const placements = useMemo(() => scenario.placements, [scenario]);

	return (
		<group {...props}>
			{placements.map(
				(
					placement: CityLayoutScenario["placements"][number],
					index: number,
				) => {
					const model = getCityModelById(placement.modelId);
					if (!model) {
						return null;
					}
					const centerX =
						(placement.cellX - scenario.gridWidth / 2) * scenario.cellSize +
						scenario.cellSize / 2;
					const centerZ =
						(placement.cellY - scenario.gridHeight / 2) * scenario.cellSize +
						scenario.cellSize / 2;
					const offset = edgeOffset(scenario.cellSize, placement.edge);
					const targetSpan =
						placement.layer === "structure"
							? scenario.cellSize * 0.82
							: placement.layer === "detail"
								? scenario.cellSize * 0.45
								: scenario.cellSize * 0.88;
					const elevation =
						placement.layer === "roof"
							? 1.8
							: placement.layer === "detail"
								? 0.7
								: placement.layer === "prop"
									? 0.3
									: 0;

					return (
						<group
							key={`${placement.modelId}-${index}`}
							position={[centerX + offset.x, elevation, centerZ + offset.z]}
							rotation={[0, (Math.PI / 2) * placement.rotationQuarterTurns, 0]}
						>
							<CityModelMesh model={model} targetSpan={targetSpan} />
						</group>
					);
				},
			)}
			<gridHelper
				args={[
					Math.max(scenario.gridWidth, scenario.gridHeight) * scenario.cellSize,
					Math.max(scenario.gridWidth, scenario.gridHeight),
					0x2f8daa,
					0x123241,
				]}
				position={[0, 0.02, 0]}
			/>
		</group>
	);
}
