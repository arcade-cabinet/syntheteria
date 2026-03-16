import { useMemo } from "react";
import { buildBlankCityAssembly } from "../city/assemblyContract";
import { buildCityLayoutPlan } from "../city/layoutPlan";
import { CityAssemblyRenderer } from "../city/runtime/CityAssemblyRenderer";
import { getActiveCityInstance } from "../world/cityTransition";

export function CityInteriorRenderer() {
	const activeCity = getActiveCityInstance();

	const layoutScenario = useMemo(() => {
		if (!activeCity) {
			return null;
		}
		const plan = buildCityLayoutPlan(
			activeCity.layout_seed,
			buildBlankCityAssembly(activeCity.layout_seed),
		);
		return {
			id: `city-${activeCity.id}`,
			label: activeCity.name,
			description: `Persistent city instance for ${activeCity.name}`,
			gridWidth: plan.contract.gridWidth,
			gridHeight: plan.contract.gridHeight,
			cellSize: plan.contract.cellSize,
			placements: plan.placements.map((placement) => ({
				modelId: placement.assetId,
				cellX: placement.cellX,
				cellY: placement.cellY,
				layer: placement.layer,
				edge: placement.edge,
				rotationQuarterTurns: placement.rotationQuarterTurns,
			})),
		};
	}, [activeCity]);

	if (!layoutScenario) {
		return null;
	}

	return (
		<CityAssemblyRenderer scenario={layoutScenario} position={[0, 0, 0]} />
	);
}
