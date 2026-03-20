/**
 * Tests for epochAtmosphere — epoch-based visual atmosphere transitions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import {
	applyEpochAtmosphere,
	getCurrentAtmosphereEpoch,
	getEpochAtmosphereParams,
	resetEpochAtmosphere,
} from "../lighting/epochAtmosphere";

function makeScene(): THREE.Scene {
	return new THREE.Scene();
}

describe("epochAtmosphere", () => {
	beforeEach(() => {
		resetEpochAtmosphere();
	});

	describe("applyEpochAtmosphere", () => {
		it("sets fog density for epoch 1 (Emergence)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 1);
			expect(scene.fog).toBeDefined();
			const fog = scene.fog as THREE.FogExp2;
			expect(fog.density).toBeCloseTo(0.008, 5);
		});

		it("sets fog density for epoch 2 (Expansion)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 2);
			const fog = scene.fog as THREE.FogExp2;
			expect(fog.density).toBeCloseTo(0.012, 5);
		});

		it("sets fog density for epoch 3 (Consolidation)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 3);
			const fog = scene.fog as THREE.FogExp2;
			expect(fog.density).toBeCloseTo(0.015, 5);
		});

		it("sets fog density for epoch 4 (Convergence)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 4);
			const fog = scene.fog as THREE.FogExp2;
			expect(fog.density).toBeCloseTo(0.02, 5);
		});

		it("sets fog density for epoch 5 (Transcendence)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 5);
			const fog = scene.fog as THREE.FogExp2;
			expect(fog.density).toBeCloseTo(0.025, 5);
		});

		it("adds accent lights for epoch 4 (Convergence)", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 4);
			const pointLights = scene.children.filter(
				(c) => (c as THREE.PointLight).isPointLight,
			);
			// Epoch 4 has 3 accent lights
			expect(pointLights.length).toBe(3);
		});

		it("adds ambient and directional lights", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 1);
			const ambients = scene.children.filter(
				(c) => c.userData.tag === "epoch-atmosphere-ambient",
			);
			const suns = scene.children.filter(
				(c) => c.userData.tag === "epoch-atmosphere-sun",
			);
			expect(ambients.length).toBe(1);
			expect(suns.length).toBe(1);
		});

		it("cleans up previous epoch lights when changing epoch", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 4); // 3 accent lights
			applyEpochAtmosphere(scene, 1); // 1 accent light
			const pointLights = scene.children.filter(
				(c) =>
					(c as THREE.PointLight).isPointLight &&
					c.userData.tag === "epoch-atmosphere-light",
			);
			expect(pointLights.length).toBe(1);
		});

		it("does not rebuild if epoch has not changed", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 2);
			const childCount = scene.children.length;
			applyEpochAtmosphere(scene, 2);
			expect(scene.children.length).toBe(childCount);
		});

		it("clamps epoch to valid range", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 0);
			expect(getCurrentAtmosphereEpoch()).toBe(1);

			resetEpochAtmosphere();
			applyEpochAtmosphere(scene, 99);
			expect(getCurrentAtmosphereEpoch()).toBe(5);
		});

		it("updates scene background color per epoch", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 5);
			const params = getEpochAtmosphereParams(5);
			const bgColor = (scene.background as THREE.Color).getHex();
			expect(bgColor).toBe(params.backgroundColor);
		});
	});

	describe("getCurrentAtmosphereEpoch", () => {
		it("returns 0 before any epoch is applied", () => {
			expect(getCurrentAtmosphereEpoch()).toBe(0);
		});

		it("returns the current epoch number after apply", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 3);
			expect(getCurrentAtmosphereEpoch()).toBe(3);
		});
	});

	describe("getEpochAtmosphereParams", () => {
		it("returns parameters for each valid epoch", () => {
			for (let i = 1; i <= 5; i++) {
				const params = getEpochAtmosphereParams(i);
				expect(params.fogDensity).toBeGreaterThan(0);
				expect(params.ambientIntensity).toBeGreaterThan(0);
				expect(params.sunIntensity).toBeGreaterThan(0);
			}
		});

		it("fog density increases with epoch number", () => {
			const densities = [1, 2, 3, 4, 5].map(
				(e) => getEpochAtmosphereParams(e).fogDensity,
			);
			for (let i = 1; i < densities.length; i++) {
				expect(densities[i]).toBeGreaterThan(densities[i - 1]);
			}
		});

		it("epoch 5 has wormhole glow accent light", () => {
			const params = getEpochAtmosphereParams(5);
			// Should have 4 accent lights for Transcendence
			expect(params.accentLights.length).toBe(4);
			// Wormhole glow should be the brightest (intensity 1.2)
			const wormhole = params.accentLights.find(
				(l) => l.intensity >= 1.0,
			);
			expect(wormhole).toBeDefined();
		});
	});

	describe("resetEpochAtmosphere", () => {
		it("resets epoch tracker to 0", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 3);
			expect(getCurrentAtmosphereEpoch()).toBe(3);
			resetEpochAtmosphere();
			expect(getCurrentAtmosphereEpoch()).toBe(0);
		});

		it("allows reapplying same epoch after reset", () => {
			const scene = makeScene();
			applyEpochAtmosphere(scene, 2);
			resetEpochAtmosphere();
			// Should actually apply now since internal tracker was reset
			applyEpochAtmosphere(scene, 2);
			expect(getCurrentAtmosphereEpoch()).toBe(2);
		});
	});
});
