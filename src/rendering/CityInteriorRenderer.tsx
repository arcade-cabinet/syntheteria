import { useMemo } from "react";
import { buildCityLayoutPlan } from "../city/layoutPlan";
import { getActiveCityInstance } from "../world/cityTransition";

const MODULE_COLORS = {
	core: 0x16394a,
	power: 0x406d8a,
	fabrication: 0x7a6336,
	storage: 0x3a3a44,
	habitation: 0x2f4b3c,
	corridor: 0x0d1820,
} as const;

const LAYER_COLORS = {
	structure: 0x7db7cf,
	door: 0xb5ecff,
	prop: 0x6a88a8,
	roof: 0x274452,
	detail: 0xffc971,
} as const;

export function CityInteriorRenderer() {
	const activeCity = getActiveCityInstance();

	const layout = useMemo(() => {
		if (!activeCity) {
			return null;
		}

		return buildCityLayoutPlan(activeCity.layout_seed);
	}, [activeCity]);

	if (!layout) {
		return null;
	}

	const { contract } = layout;

	return (
		<group position={[0, 0, 0]}>
			{contract.cells.map((cell) => {
				const color = MODULE_COLORS[cell.module];
				const centerX =
					(cell.x - contract.gridWidth / 2) * contract.cellSize +
					contract.cellSize / 2;
				const centerZ =
					(cell.y - contract.gridHeight / 2) * contract.cellSize +
					contract.cellSize / 2;
				const placements = layout.placements.filter(
					(placement) =>
						placement.cellX === cell.x && placement.cellY === cell.y,
				);
				const structurePlacements = placements.filter(
					(placement) => placement.layer === "structure",
				);
				const propPlacements = placements.filter(
					(placement) => placement.layer === "prop",
				);
				const roofPlacements = placements.filter(
					(placement) => placement.layer === "roof",
				);

				return (
					<group key={`${cell.x},${cell.y}`}>
						<mesh
							position={[centerX, 0, centerZ]}
							rotation={[-Math.PI / 2, 0, 0]}
						>
							<planeGeometry
								args={[contract.cellSize * 0.96, contract.cellSize * 0.96]}
							/>
							<meshBasicMaterial color={color} />
						</mesh>
						{cell.module !== "corridor" && (
							<mesh position={[centerX, 0.5, centerZ]}>
								<boxGeometry args={[1.3, 1, 1.3]} />
								<meshLambertMaterial color={color} />
							</mesh>
						)}
						{structurePlacements.map((placement) => {
							const offset =
								placement.edge === "north"
									? [0, 0.55, -contract.cellSize * 0.48]
									: placement.edge === "south"
										? [0, 0.55, contract.cellSize * 0.48]
										: placement.edge === "east"
											? [contract.cellSize * 0.48, 0.55, 0]
											: [-contract.cellSize * 0.48, 0.55, 0];
							const isDoor = placement.assetId.includes("door");
							return (
								<mesh
									key={`${placement.assetId}-${placement.edge}`}
									position={[
										centerX + offset[0],
										offset[1],
										centerZ + offset[2],
									]}
								>
									<boxGeometry
										args={
											placement.edge === "north" || placement.edge === "south"
												? [contract.cellSize * 0.7, 1.1, 0.16]
												: [0.16, 1.1, contract.cellSize * 0.7]
										}
									/>
									<meshLambertMaterial
										color={isDoor ? LAYER_COLORS.door : LAYER_COLORS.structure}
									/>
								</mesh>
							);
						})}
						{propPlacements.map((placement) => (
							<mesh
								key={placement.assetId}
								position={[centerX, 0.35, centerZ]}
								rotation={[
									0,
									(Math.PI / 2) * placement.rotationQuarterTurns,
									0,
								]}
							>
								<cylinderGeometry args={[0.22, 0.28, 0.5, 8]} />
								<meshLambertMaterial color={LAYER_COLORS.prop} />
							</mesh>
						))}
						{roofPlacements.map((placement) => (
							<mesh
								key={placement.assetId}
								position={[centerX, 1.02, centerZ]}
								rotation={[-Math.PI / 2, 0, 0]}
							>
								<planeGeometry
									args={[contract.cellSize * 0.82, contract.cellSize * 0.82]}
								/>
								<meshBasicMaterial color={LAYER_COLORS.roof} />
							</mesh>
						))}
					</group>
				);
			})}

			<gridHelper
				args={[
					contract.gridWidth * contract.cellSize,
					contract.gridWidth,
					0x2f8daa,
					0x123241,
				]}
				position={[0, 0.02, 0]}
			/>
			<mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<planeGeometry
					args={[
						contract.gridWidth * contract.cellSize,
						contract.gridHeight * contract.cellSize,
					]}
				/>
				<meshBasicMaterial color={0x04090d} />
			</mesh>
		</group>
	);
}
