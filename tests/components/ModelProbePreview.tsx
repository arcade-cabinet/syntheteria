import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { getCityModelById } from "../../src/city/catalog/cityCatalog";
import { CityModelMesh } from "../../src/city/runtime/CityModelMesh";

const wallModel = getCityModelById("walls_wall_1");
const columnModel = getCityModelById("column_1");
const doorModel = getCityModelById("door_single");

export function ModelProbePreview() {
	return (
		<div
			style={{
				width: 1200,
				height: 800,
				background: "linear-gradient(180deg, #20313b 0%, #0d151d 100%)",
			}}
		>
			<Canvas camera={{ position: [0, 7, 10], fov: 42 }}>
				<color attach="background" args={["#0d151d"]} />
				<ambientLight intensity={1.3} color={0xb0c5d6} />
				<hemisphereLight args={[0xa9d8ff, 0x17232d, 1.1]} />
				<directionalLight
					position={[8, 16, 10]}
					intensity={2.1}
					color={0xffffff}
				/>
				<directionalLight
					position={[-6, 9, -5]}
					intensity={1.2}
					color={0x8be6ff}
				/>
				<mesh
					rotation={[-Math.PI / 2, 0, 0]}
					position={[0, -0.02, 0]}
					receiveShadow
				>
					<planeGeometry args={[18, 18]} />
					<meshStandardMaterial
						color={0x4b5c66}
						roughness={0.9}
						metalness={0.06}
					/>
				</mesh>
				<Suspense fallback={null}>
					{wallModel ? (
						<group position={[-3.5, 0, 0]}>
							<CityModelMesh model={wallModel} targetSpan={4} />
						</group>
					) : null}
					{columnModel ? (
						<group position={[0, 0, 0]}>
							<CityModelMesh model={columnModel} targetSpan={3} />
						</group>
					) : null}
					{doorModel ? (
						<group position={[3.5, 0, 0]}>
							<CityModelMesh model={doorModel} targetSpan={4} />
						</group>
					) : null}
				</Suspense>
			</Canvas>
		</div>
	);
}
