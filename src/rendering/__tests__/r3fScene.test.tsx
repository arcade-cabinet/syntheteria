/**
 * R3F scene-graph tests using @react-three/test-renderer.
 * Asserts on scene structure without a real WebGL context.
 */
import { create } from "@react-three/test-renderer";
import React from "react";
import * as THREE from "three";

describe("R3F scene graph", () => {
	it("renders a mesh and exposes scene graph", async () => {
		const renderer = await create(
			<mesh>
				<boxGeometry args={[1, 1, 1]} />
				<meshStandardMaterial color="red" />
			</mesh>,
		);

		const graph = renderer.toGraph();
		expect(graph).toBeDefined();
		expect(Array.isArray(graph)).toBe(true);
		expect((graph as { length: number }).length).toBeGreaterThan(0);

		const mesh = renderer.scene.findByType("Mesh");
		expect(mesh).toBeDefined();
		expect(mesh.type).toBe("Mesh");
		expect(mesh.instance).toBeInstanceOf(THREE.Mesh);

		await renderer.unmount();
	});

	it("toGraph includes Mesh and geometry/material structure", async () => {
		const renderer = await create(
			<mesh name="test-box">
				<boxGeometry args={[2, 2, 2]} />
				<meshStandardMaterial color="#ff0000" />
			</mesh>,
		);

		const graph = renderer.toGraph();
		expect(graph).toBeDefined();
		const flat = JSON.stringify(graph);
		expect(flat).toContain("Mesh");
		expect(flat).toContain("test-box");

		await renderer.unmount();
	});

	it("renders a group with multiple meshes (structure-style scene)", async () => {
		const renderer = await create(
			<group name="structure-group">
				<mesh name="floor">
					<boxGeometry args={[4, 0.1, 4]} />
					<meshStandardMaterial color="#71879b" />
				</mesh>
				<mesh name="wall" position={[0, 0.5, -2]}>
					<boxGeometry args={[4, 1, 0.2]} />
					<meshStandardMaterial color="#5e7385" />
				</mesh>
			</group>,
		);

		const graph = renderer.toGraph();
		expect(graph).toBeDefined();
		const flat = JSON.stringify(graph);
		expect(flat).toContain("structure-group");
		expect(flat).toContain("floor");
		expect(flat).toContain("wall");

		const meshes = renderer.scene.findAllByType("Mesh");
		expect(meshes.length).toBe(2);

		await renderer.unmount();
	});
});
