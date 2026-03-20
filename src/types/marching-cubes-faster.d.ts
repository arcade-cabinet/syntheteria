/**
 * Type declarations for marching-cubes-faster (no upstream types).
 * The package is CJS; Vite exposes it as a default export.
 */
declare module "marching-cubes-faster" {
	type Sector = [[number, number, number], [number, number, number]];
	type DfObj = unknown;

	interface DfBuilder {
		addBrick(
			list: DfObj[],
			sector: Sector,
			radius: number,
			doSubtract: boolean,
			color: [number, number, number],
		): DfObj[];
		subtractBrick(
			list: DfObj[],
			sector: Sector,
			radius: number,
			color: [number, number, number],
		): DfObj[];
		addLine(
			list: DfObj[],
			line: [[number, number, number], [number, number, number]],
			radius: number,
			doSubtract: boolean,
			color: [number, number, number],
		): DfObj[];
	}

	interface MeshResult {
		positions: [number, number, number][];
		cells: [number, number, number][];
		colors: [number, number, number][];
	}

	interface MeshBuilder {
		buildForList(
			dfObjList: DfObj[],
			iters?: number,
			renderBlock?: Sector,
			_dfBuilderResult?: unknown,
		): MeshResult;
		dfListBounds(dfList: DfObj[]): Sector;
	}

	interface MarchingCubesFaster {
		dfBuilder: DfBuilder;
		meshBuilder: MeshBuilder;
	}

	const mcf: MarchingCubesFaster;
	export default mcf;
	export const dfBuilder: DfBuilder;
	export const meshBuilder: MeshBuilder;
}
