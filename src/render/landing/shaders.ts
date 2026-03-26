/**
 * WGSL shaders for the diegetic title menu scene.
 *
 * Written for BabylonJS ShaderMaterial with ShaderLanguage.WGSL.
 * Registered in ShadersStoreWGSL, using #include<sceneUboDeclaration> and
 * #include<meshUboDeclaration> for built-in transforms (scene.viewProjection,
 * mesh.world).
 *
 * Visual vocabulary:
 *   - Storm clouds: deep graphite blues, multi-layer fbm turbulence
 *   - Globe: Earth continents -> ecumenopolis lattice spread with cyan/mint lights
 *   - Lightning: jagged bolts with additive cyan glow
 *   - Hypercane: spiral storm band around the globe equator
 *   - Wormhole: purple zenith glow pulsing above everything
 */

// --- Storm Clouds (BackSide sphere) ---

export const stormVertexShader = /* wgsl */ `
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute uv : vec2<f32>;

varying vUv : vec2<f32>;
varying vPosition : vec3<f32>;
varying vNormal : vec3<f32>;
varying vWorldPosition : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.vUv = vertexInputs.uv;
    vertexOutputs.vPosition = vertexInputs.position;
    let worldPos = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.vNormal = normalize((mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    vertexOutputs.vWorldPosition = worldPos.xyz;
    vertexOutputs.position = scene.viewProjection * worldPos;
}
`;

export const stormFragmentShader = /* wgsl */ `
#include<sceneUboDeclaration>

uniform uTime : f32;
uniform uColor1 : vec3<f32>;
uniform uColor2 : vec3<f32>;

varying vUv : vec2<f32>;
varying vPosition : vec3<f32>;
varying vNormal : vec3<f32>;
varying vWorldPosition : vec3<f32>;

fn hash3(p: vec3<f32>) -> f32 {
    var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let a = hash3(i);
    let b = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
    let c = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
    let d = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
    let e = hash3(i + vec3<f32>(0.0, 0.0, 1.0));
    let f2 = hash3(i + vec3<f32>(1.0, 0.0, 1.0));
    let g = hash3(i + vec3<f32>(0.0, 1.0, 1.0));
    let h = hash3(i + vec3<f32>(1.0, 1.0, 1.0));

    return mix(
        mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
        mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
        f.z
    );
}

fn fbm7(p_in: vec3<f32>) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var p = p_in;
    for (var i: i32 = 0; i < 7; i++) {
        value += amplitude * noise3(p);
        p *= 2.1;
        amplitude *= 0.45;
    }
    return value;
}

fn turbulence(p: vec3<f32>) -> f32 {
    var t: f32 = 0.0;
    var f: f32 = 1.0;
    for (var i: i32 = 0; i < 4; i++) {
        t += abs(fbm7(p * f)) / f;
        f *= 2.0;
    }
    return t;
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let pos = normalize(fragmentInputs.vPosition);

    // Multi-layer storm system with slow churn
    let stormLayer1 = fbm7(pos * 3.0 + uniforms.uTime * 0.08);
    let stormLayer2 = fbm7(pos * 5.0 - vec3<f32>(uniforms.uTime * 0.12, 0.0, uniforms.uTime * 0.1));
    let stormLayer3 = turbulence(pos * 2.0 + uniforms.uTime * 0.05);

    var density = stormLayer1 * 0.4 + stormLayer2 * 0.3 + stormLayer3 * 0.3;
    density = smoothstep(0.3, 0.8, density);

    // Storm color: deep graphite -> slate blue, matching game palette
    let darkCloud = vec3<f32>(0.02, 0.03, 0.07);
    let stormCloud = vec3<f32>(0.06, 0.08, 0.14);
    let lightEdge = vec3<f32>(0.10, 0.14, 0.22);

    var color = mix(darkCloud, stormCloud, stormLayer1);
    color = mix(color, lightEdge, stormLayer2 * 0.3);

    // Wormhole glow at zenith -- purple, pulsing
    let zenithDist = length(pos.xz);
    let wormholeRadius = 0.25 + 0.08 * sin(uniforms.uTime * 0.6);
    let wormholeGlow = smoothstep(wormholeRadius, 0.0, zenithDist);
    let wormholePulse = 0.5 + 0.5 * sin(uniforms.uTime * 0.7);
    var wormholeColor = vec3<f32>(0.25, 0.06, 0.40) * wormholeGlow * (0.4 + 0.6 * wormholePulse);

    // Only show wormhole in upper hemisphere
    wormholeColor *= smoothstep(0.0, 0.3, pos.y);

    // Lightning flash illumination in cloud layer
    let flashSeed = floor(uniforms.uTime * 4.0);
    let flash = step(0.92, hash3(vec3<f32>(flashSeed, 0.0, 0.0)));
    let flashAngle = hash3(vec3<f32>(flashSeed, 1.0, 0.0)) * 6.28;
    let flashDir = smoothstep(1.8, 0.0, length(pos.xz - vec2<f32>(cos(flashAngle), sin(flashAngle)) * 0.5));
    let flashColor = vec3<f32>(0.25, 0.35, 0.55) * flash * flashDir * 0.3;

    // View-dependent fresnel, not a hard-coded world-axis rim.
    let viewDir = normalize(scene.vEyePosition.xyz - fragmentInputs.vWorldPosition);
    let fresnel = pow(1.0 - max(0.0, dot(normalize(fragmentInputs.vNormal), viewDir)), 2.0);
    var alpha = density * (0.6 + fresnel * 0.4);
    alpha *= smoothstep(0.0, 0.3, density);

    let finalColor = (color + wormholeColor + flashColor) * 1.35;

    fragmentOutputs.color = vec4<f32>(finalColor, alpha * 0.95);
}
`;

// --- Lightning Bolts (additive plane) ---

export const lightningVertexShader = /* wgsl */ `
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute uv : vec2<f32>;

varying vUv : vec2<f32>;
varying vPosition : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.vUv = vertexInputs.uv;
    vertexOutputs.vPosition = vertexInputs.position;
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
}
`;

export const lightningFragmentShader = /* wgsl */ `
uniform uTime : f32;
uniform uFlash : f32;
uniform uBoltStart : vec2<f32>;
uniform uBoltEnd : vec2<f32>;

varying vUv : vec2<f32>;

fn hash1(n: f32) -> f32 {
    var p = fract(n * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

fn lightningBolt(uv: vec2<f32>, start: vec2<f32>, end: vec2<f32>, time: f32) -> f32 {
    let dir = normalize(end - start);
    let perp = vec2<f32>(-dir.y, dir.x);
    let segLen = length(end - start);

    let t = dot(uv - start, dir) / segLen;
    let offset = dot(uv - start, perp);

    if (t < 0.0 || t > 1.0) {
        return 0.0;
    }

    // Jagged pattern from hash-based offsets at each segment
    var zigzag: f32 = 0.0;
    for (var i: i32 = 0; i < 8; i++) {
        let fi = f32(i);
        let segment = fract(t * 8.0 - fi);
        zigzag += (hash1(fi + time * 0.1) - 0.5) * exp(-segment * 10.0) * 0.3;
    }

    let dist = abs(offset - zigzag);
    var bolt = exp(-dist * 60.0);     // sharp core
    bolt += exp(-dist * 15.0) * 0.3;  // soft glow

    return bolt * smoothstep(1.0, 0.0, abs(t * 2.0 - 1.0));
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let uv = (fragmentInputs.vUv - 0.5) * 2.0;

    var bolt: f32 = 0.0;
    bolt += lightningBolt(uv, uniforms.uBoltStart, uniforms.uBoltEnd, uniforms.uTime);
    bolt += lightningBolt(uv, uniforms.uBoltStart + vec2<f32>(0.2, 0.1), uniforms.uBoltEnd + vec2<f32>(-0.1, 0.2), uniforms.uTime + 1.0) * 0.6;
    bolt += lightningBolt(uv, uniforms.uBoltStart - vec2<f32>(0.15, 0.05), uniforms.uBoltEnd - vec2<f32>(0.2, -0.1), uniforms.uTime + 2.0) * 0.7;

    let intensity = bolt * uniforms.uFlash;
    // Cyan-white lightning matching the game's signal color
    let color = vec3<f32>(0.5, 0.85, 1.0) * intensity * 2.0;

    fragmentOutputs.color = vec4<f32>(color, intensity);
}
`;

// --- Globe with Ecumenopolis Growth ---

export const globeVertexShader = /* wgsl */ `
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute uv : vec2<f32>;

varying vUv : vec2<f32>;
varying vNormal : vec3<f32>;
varying vPosition : vec3<f32>;
varying vWorldPosition : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.vUv = vertexInputs.uv;
    let worldPos = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.vNormal = normalize((mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    vertexOutputs.vPosition = vertexInputs.position;
    vertexOutputs.vWorldPosition = worldPos.xyz;
    vertexOutputs.position = scene.viewProjection * worldPos;
}
`;

export const globeFragmentShader = /* wgsl */ `
#include<sceneUboDeclaration>

uniform uTime : f32;
uniform uGrowth : f32;

varying vUv : vec2<f32>;
varying vNormal : vec3<f32>;
varying vPosition : vec3<f32>;
varying vWorldPosition : vec3<f32>;

fn hash3(p: vec3<f32>) -> f32 {
    var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let a = hash3(i);
    let b = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
    let c = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
    let d = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
    let e = hash3(i + vec3<f32>(0.0, 0.0, 1.0));
    let f2 = hash3(i + vec3<f32>(1.0, 0.0, 1.0));
    let g = hash3(i + vec3<f32>(0.0, 1.0, 1.0));
    let h = hash3(i + vec3<f32>(1.0, 1.0, 1.0));

    return mix(
        mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
        mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
        f.z
    );
}

fn fbm6(p_in: vec3<f32>) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var p = p_in;
    for (var i: i32 = 0; i < 6; i++) {
        value += amplitude * noise3(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Procedural continent generation from noise threshold on the sphere
fn continentPattern(pos: vec3<f32>) -> f32 {
    // Use spherical coordinates
    let lat = asin(clamp(pos.y, -1.0, 1.0));

    // Base continent shape from low-frequency noise on the sphere
    let n1 = fbm6(pos * 2.0 + vec3<f32>(0.0, 0.0, 0.0));
    let n2 = fbm6(pos * 3.0 + vec3<f32>(7.0, 13.0, 19.0));

    // Create continent-like patches using noise threshold
    var land = smoothstep(0.42, 0.58, n1 * 0.6 + n2 * 0.4);

    // Reduce land at poles (ice caps are ocean in our ecumenopolis)
    land *= smoothstep(1.2, 0.6, abs(lat));

    // Add some coastal detail
    let coast = fbm6(pos * 12.0) * 0.15;
    land = smoothstep(0.3 - coast, 0.5 + coast, land);

    return clamp(land, 0.0, 1.0);
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let pos = normalize(fragmentInputs.vPosition);

    // Terrain: continents with coastal detail
    var landMask = continentPattern(pos);
    let coastDetail = fbm6(pos * 15.0) * 0.3;
    landMask = smoothstep(0.4 - coastDetail, 0.5 + coastDetail, landMask);

    // Lattice growth: starts from land, then spreads to ocean platforms
    let latticePattern = fbm6(pos * 6.0 + uniforms.uTime * 0.03);
    let growth = smoothstep(0.0, 1.0, uniforms.uGrowth);

    var latticeSpread = landMask * growth * 2.0;
    latticeSpread += (1.0 - landMask) * max(0.0, growth * 2.0 - 1.0);
    latticeSpread = clamp(latticeSpread, 0.0, 1.0);

    let latticeMask = smoothstep(0.3, 0.7, latticePattern + latticeSpread * 0.5) * latticeSpread;

    // Ocean colors: deep graphite-blue matching game palette
    let deepOcean = vec3<f32>(0.01, 0.02, 0.06);
    let shallowOcean = vec3<f32>(0.02, 0.04, 0.10);
    let coastalWater = vec3<f32>(0.03, 0.07, 0.13);

    // Land colors: muted industrial greens/browns
    let plains = vec3<f32>(0.10, 0.13, 0.07);
    let forest = vec3<f32>(0.06, 0.10, 0.06);
    let desert = vec3<f32>(0.15, 0.13, 0.09);

    // Machine lattice colors: the ecumenopolis palette
    let latticeBase = vec3<f32>(0.09, 0.10, 0.13);
    let latticeDense = vec3<f32>(0.14, 0.16, 0.21);
    let latticeCore = vec3<f32>(0.20, 0.25, 0.35);
    let latticeGlow = vec3<f32>(0.35, 0.75, 0.88);  // cyan-mint lattice lights

    // Ocean depth variation
    let oceanDepth = fbm6(pos * 8.0);
    var oceanColor = mix(deepOcean, shallowOcean, oceanDepth);
    oceanColor = mix(oceanColor, coastalWater, landMask * 0.3);

    // Land type variation
    let landType = fbm6(pos * 5.0 + vec3<f32>(100.0, 0.0, 0.0));
    var landColor = mix(forest, plains, smoothstep(0.3, 0.7, landType));
    landColor = mix(landColor, desert, smoothstep(0.7, 1.0, landType) * abs(pos.y));

    let terrainColor = mix(oceanColor, landColor, landMask);

    // Progressive machine coverage
    var machineColor = mix(latticeBase, latticeDense, latticePattern);
    machineColor = mix(machineColor, latticeCore, smoothstep(0.5, 1.0, latticeMask));

    var color = mix(terrainColor, machineColor, latticeMask);

    // Lattice lights: pulsing grid pattern in dense areas
    let lightGrid = fbm6(pos * 40.0 + uniforms.uTime * 0.2);
    var lights = latticeMask * smoothstep(0.4, 0.6, lightGrid);
    lights *= (0.5 + 0.5 * sin(uniforms.uTime * 2.0 + latticePattern * 30.0));
    lights *= smoothstep(0.3, 0.8, latticeMask);

    color += latticeGlow * lights * 0.6;

    // Use the actual view direction so the rim light tracks the camera.
    let viewDir = normalize(scene.vEyePosition.xyz - fragmentInputs.vWorldPosition);
    let fresnel = pow(1.0 - max(0.0, dot(normalize(fragmentInputs.vNormal), viewDir)), 3.0);
    let atmosColor = mix(vec3<f32>(0.04, 0.12, 0.25), vec3<f32>(0.12, 0.22, 0.32), latticeMask);
    color += atmosColor * fresnel * 0.9;

    // Cloud shadows
    let clouds = fbm6(pos * 10.0 + uniforms.uTime * 0.1) * 0.1;
    color *= (1.0 - clouds * (1.0 - latticeMask * 0.8));

    // Keep the globe readable against the nearly-black menu background.
    color += vec3<f32>(0.025, 0.035, 0.05);
    color *= 1.25;

    fragmentOutputs.color = vec4<f32>(color, 1.0);
}
`;

// --- Unified Landing Hero Globe ---

export const landingHeroVertexShader = globeVertexShader;

export const landingHeroFragmentShader = /* wgsl */ `
#include<sceneUboDeclaration>

uniform uTime : f32;
uniform uGrowth : f32;
var logoSamplerSampler: sampler;
var logoSampler: texture_2d<f32>;

varying vUv : vec2<f32>;
varying vNormal : vec3<f32>;
varying vPosition : vec3<f32>;
varying vWorldPosition : vec3<f32>;

fn hash3(p: vec3<f32>) -> f32 {
    var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let a = hash3(i);
    let b = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
    let c = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
    let d = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
    let e = hash3(i + vec3<f32>(0.0, 0.0, 1.0));
    let f2 = hash3(i + vec3<f32>(1.0, 0.0, 1.0));
    let g = hash3(i + vec3<f32>(0.0, 1.0, 1.0));
    let h = hash3(i + vec3<f32>(1.0, 1.0, 1.0));

    return mix(
        mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
        mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
        f.z
    );
}

fn fbm6(p_in: vec3<f32>) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var p = p_in;
    for (var i: i32 = 0; i < 6; i++) {
        value += amplitude * noise3(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

fn fbm7(p_in: vec3<f32>) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var p = p_in;
    for (var i: i32 = 0; i < 7; i++) {
        value += amplitude * noise3(p);
        p *= 2.1;
        amplitude *= 0.45;
    }
    return value;
}

fn continentPattern(pos: vec3<f32>) -> f32 {
    // Use spherical coordinates
    let lat = asin(clamp(pos.y, -1.0, 1.0));

    // Base continent shape from low-frequency noise on the sphere
    let n1 = fbm6(pos * 2.0 + vec3<f32>(0.0, 0.0, 0.0));
    let n2 = fbm6(pos * 3.0 + vec3<f32>(7.0, 13.0, 19.0));

    // Create continent-like patches using noise threshold
    var land = smoothstep(0.42, 0.58, n1 * 0.6 + n2 * 0.4);

    // Reduce land at poles (ice caps are ocean in our ecumenopolis)
    land *= smoothstep(1.2, 0.6, abs(lat));

    // Add some coastal detail
    let coast = fbm6(pos * 12.0) * 0.15;
    land = smoothstep(0.3 - coast, 0.5 + coast, land);

    return clamp(land, 0.0, 1.0);
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let pos = normalize(fragmentInputs.vPosition);
    let viewDir = normalize(scene.vEyePosition.xyz - fragmentInputs.vWorldPosition);
    let fresnel = pow(1.0 - max(0.0, dot(normalize(fragmentInputs.vNormal), viewDir)), 3.0);

    var landMask = continentPattern(pos);
    let coastDetail = fbm6(pos * 15.0) * 0.3;
    landMask = smoothstep(0.4 - coastDetail, 0.5 + coastDetail, landMask);

    let latticePattern = fbm6(pos * 6.0 + uniforms.uTime * 0.03);
    let growth = smoothstep(0.0, 1.0, uniforms.uGrowth);
    var latticeSpread = landMask * growth * 2.0;
    latticeSpread += (1.0 - landMask) * max(0.0, growth * 2.0 - 1.0);
    latticeSpread = clamp(latticeSpread, 0.0, 1.0);
    let latticeMask = smoothstep(0.3, 0.7, latticePattern + latticeSpread * 0.5) * latticeSpread;

    let deepOcean = vec3<f32>(0.01, 0.02, 0.06);
    let shallowOcean = vec3<f32>(0.02, 0.04, 0.10);
    let coastalWater = vec3<f32>(0.03, 0.07, 0.13);
    let plains = vec3<f32>(0.10, 0.13, 0.07);
    let forest = vec3<f32>(0.06, 0.10, 0.06);
    let desert = vec3<f32>(0.15, 0.13, 0.09);
    let latticeBase = vec3<f32>(0.09, 0.10, 0.13);
    let latticeDense = vec3<f32>(0.14, 0.16, 0.21);
    let latticeCore = vec3<f32>(0.20, 0.25, 0.35);
    let latticeGlow = vec3<f32>(0.35, 0.75, 0.88);

    let oceanDepth = fbm6(pos * 8.0);
    var oceanColor = mix(deepOcean, shallowOcean, oceanDepth);
    oceanColor = mix(oceanColor, coastalWater, landMask * 0.3);

    let landType = fbm6(pos * 5.0 + vec3<f32>(100.0, 0.0, 0.0));
    var landColor = mix(forest, plains, smoothstep(0.3, 0.7, landType));
    landColor = mix(landColor, desert, smoothstep(0.7, 1.0, landType) * abs(pos.y));

    let terrainColor = mix(oceanColor, landColor, landMask);
    var machineColor = mix(latticeBase, latticeDense, latticePattern);
    machineColor = mix(machineColor, latticeCore, smoothstep(0.5, 1.0, latticeMask));
    var color = mix(terrainColor, machineColor, latticeMask);

    let lightGrid = fbm6(pos * 40.0 + uniforms.uTime * 0.2);
    var cityLights = latticeMask * smoothstep(0.4, 0.6, lightGrid);
    cityLights *= (0.5 + 0.5 * sin(uniforms.uTime * 2.0 + latticePattern * 30.0));
    cityLights *= smoothstep(0.3, 0.8, latticeMask);
    color += latticeGlow * cityLights * 0.6;

    let longitude = atan2(pos.z, pos.x);
    let equatorBand = 1.0 - smoothstep(0.10, 0.35, abs(pos.y));
    let cycloneSwirl = sin(longitude * 12.0 + uniforms.uTime * 1.8 + fbm6(pos * 8.0) * 4.0) * 0.5 + 0.5;
    let cycloneTurbulence = fbm7(pos * 9.0 + vec3<f32>(uniforms.uTime * 0.12, 0.0, -uniforms.uTime * 0.08));
    let cycloneMask = equatorBand * smoothstep(0.38, 0.72, cycloneSwirl * 0.7 + cycloneTurbulence * 0.6);
    let cycloneColor = mix(vec3<f32>(0.08, 0.12, 0.18), vec3<f32>(0.18, 0.30, 0.45), cycloneMask);
    color = mix(color, cycloneColor, cycloneMask * 0.72);

    let stormNoise = fbm7(pos * 5.0 + vec3<f32>(uniforms.uTime * 0.05, uniforms.uTime * 0.02, -uniforms.uTime * 0.04));
    let stormMask = smoothstep(0.52, 0.78, stormNoise) * (0.45 + equatorBand * 0.55);
    color *= (1.0 - stormMask * 0.22);
    color += vec3<f32>(0.06, 0.10, 0.16) * stormMask * 0.18;

    let bandCore = 1.0 - smoothstep(0.12, 0.32, abs(pos.y));
    let bandSoft = 1.0 - smoothstep(0.25, 0.50, abs(pos.y));
    let logoField = bandSoft;
    let logoU = fract((atan2(pos.z, pos.x) + 3.14159) / 6.28318);
    let logoV = clamp(0.5 - pos.y * 2.5, 0.0, 1.0);
    let logoSample = textureSample(logoSampler, logoSamplerSampler, vec2<f32>(logoU, logoV));
    let logoAlpha = logoSample.a * bandCore;
    let logoGlow = smoothstep(0.08, 0.65, logoSample.a) * logoField;
    let bandNoise = fbm6(vec3<f32>(pos.z * 8.0, pos.y * 16.0, uniforms.uTime * 0.05));
    var bandColor = mix(vec3<f32>(0.03, 0.06, 0.11), vec3<f32>(0.08, 0.12, 0.18), logoField);
    bandColor += vec3<f32>(0.02, 0.03, 0.05) * bandNoise * logoField;
    color = mix(color, bandColor, logoField * 0.88);
    color += logoSample.rgb * logoAlpha * 1.1;
    color += vec3<f32>(0.18, 0.34, 0.48) * logoGlow * 0.55;

    let flashSeed = floor(uniforms.uTime * 3.5);
    let flashGate = step(0.82, hash3(vec3<f32>(flashSeed, 3.0, 7.0)));
    let flashAngle = hash3(vec3<f32>(flashSeed, 5.0, 11.0)) * 6.28318;
    let flashLat = (hash3(vec3<f32>(flashSeed, 13.0, 17.0)) - 0.5) * 0.36;
    let boltDir = vec3<f32>(cos(flashAngle), flashLat, sin(flashAngle));
    let boltAxis = normalize(cross(boltDir, vec3<f32>(0.0, 1.0, 0.0) + vec3<f32>(0.001, 0.0, 0.0)));
    let boltPhase = dot(pos, boltDir) * 12.0 + dot(pos, boltAxis) * 8.0;
    let boltJitter = fbm6(pos * 24.0 + vec3<f32>(flashSeed, 0.0, 0.0));
    let boltCore = abs(dot(pos, boltAxis) + (boltJitter - 0.5) * 0.18);
    let boltMask = flashGate * equatorBand * smoothstep(0.08, 0.0, boltCore) * smoothstep(0.2, 0.95, sin(boltPhase) * 0.5 + 0.5) * (1.0 - bandCore * 0.85);
    let boltGlow = flashGate * equatorBand * smoothstep(0.22, 0.0, boltCore) * (1.0 - bandCore * 0.7);
    color += vec3<f32>(0.70, 0.92, 1.0) * boltMask * 1.1;
    color += vec3<f32>(0.18, 0.30, 0.45) * boltGlow * 0.35;

    let atmosColor = mix(vec3<f32>(0.04, 0.12, 0.25), vec3<f32>(0.12, 0.22, 0.32), cycloneMask * 0.6 + latticeMask * 0.4);
    color += atmosColor * fresnel * 1.05;

    let cloudShadows = fbm6(pos * 10.0 + uniforms.uTime * 0.1) * 0.1;
    color *= (1.0 - cloudShadows * (1.0 - latticeMask * 0.8));

    color += vec3<f32>(0.025, 0.035, 0.05);
    color *= 1.22;

    fragmentOutputs.color = vec4<f32>(color, 1.0);
}
`;

// --- Hypercane Spiral Band ---

export const hypercaneVertexShader = /* wgsl */ `
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute uv : vec2<f32>;

varying vPosition : vec3<f32>;
varying vNormal : vec3<f32>;
varying vUv : vec2<f32>;
varying vWorldPosition : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let worldPos = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.vPosition = vertexInputs.position;
    vertexOutputs.vNormal = normalize((mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    vertexOutputs.vUv = vertexInputs.uv;
    vertexOutputs.vWorldPosition = worldPos.xyz;
    vertexOutputs.position = scene.viewProjection * worldPos;
}
`;

export const hypercaneFragmentShader = /* wgsl */ `
#include<sceneUboDeclaration>

uniform uTime : f32;

varying vPosition : vec3<f32>;
varying vNormal : vec3<f32>;
varying vUv : vec2<f32>;
varying vWorldPosition : vec3<f32>;

fn hash3(p: vec3<f32>) -> f32 {
    var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    let a = hash3(i);
    let b = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
    let c = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
    let d = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn fbm5(p_in: vec3<f32>) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var p = p_in;
    for (var i: i32 = 0; i < 5; i++) {
        value += amplitude * noise3(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let pos = normalize(fragmentInputs.vPosition);
    let angle = atan2(pos.z, pos.x);
    let radius = length(pos.xz);

    // Spiral rotation with turbulence
    let spiral = angle + radius * 3.0 - uniforms.uTime * 2.0;
    let spiralPattern = sin(spiral * 8.0) * 0.5 + 0.5;
    let turb = fbm5(pos * 4.0 + uniforms.uTime * 0.5);

    var intensity = spiralPattern * turb;
    intensity *= smoothstep(0.0, 0.3, radius) * smoothstep(1.2, 0.8, radius);
    intensity *= smoothstep(-0.3, 0.3, pos.y);

    // Storm spiral colors: deep blue-gray with cyan-tinted edges
    let stormColor = vec3<f32>(0.08, 0.10, 0.18);
    let glowColor = vec3<f32>(0.18, 0.30, 0.45);
    let viewDir = normalize(scene.vEyePosition.xyz - fragmentInputs.vWorldPosition);
    let fresnel = pow(1.0 - max(0.0, dot(normalize(fragmentInputs.vNormal), viewDir)), 2.0);
    var color = mix(stormColor, glowColor, intensity * 0.55);
    color += vec3<f32>(0.08, 0.16, 0.22) * fresnel * 0.8;

    let alpha = intensity * 0.55 + fresnel * 0.12;

    fragmentOutputs.color = vec4<f32>(color, alpha);
}
`;
