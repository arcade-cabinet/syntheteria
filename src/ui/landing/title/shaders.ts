/**
 * GLSL shaders for the diegetic title menu scene.
 *
 * Written for BabylonJS ShaderMaterial (attributes/uniforms declared explicitly).
 *
 * Visual vocabulary:
 *   - Storm clouds: deep graphite blues, multi-layer fbm turbulence
 *   - Globe: Earth continents -> ecumenopolis lattice spread with cyan/mint lights
 *   - Lightning: jagged bolts with additive cyan glow
 *   - Hypercane: spiral storm band around the globe equator
 *   - Wormhole: purple zenith glow pulsing above everything
 */

// --- Storm Clouds (BackSide sphere) ---

export const stormVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform mat4 world;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(mat3(world) * normal);
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

export const stormFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d = hash(i + vec3(1.0, 1.0, 0.0));
    float e = hash(i + vec3(0.0, 0.0, 1.0));
    float f2 = hash(i + vec3(1.0, 0.0, 1.0));
    float g = hash(i + vec3(0.0, 1.0, 1.0));
    float h = hash(i + vec3(1.0, 1.0, 1.0));

    return mix(
      mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
      mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 7; i++) {
      value += amplitude * noise(p);
      p *= 2.1;
      amplitude *= 0.45;
    }
    return value;
  }

  float turbulence(vec3 p) {
    float t = 0.0;
    float f = 1.0;
    for (int i = 0; i < 4; i++) {
      t += abs(fbm(p * f)) / f;
      f *= 2.0;
    }
    return t;
  }

  void main() {
    vec3 pos = normalize(vPosition);

    // Multi-layer storm system with slow churn
    float stormLayer1 = fbm(pos * 3.0 + uTime * 0.08);
    float stormLayer2 = fbm(pos * 5.0 - vec3(uTime * 0.12, 0.0, uTime * 0.1));
    float stormLayer3 = turbulence(pos * 2.0 + uTime * 0.05);

    float density = stormLayer1 * 0.4 + stormLayer2 * 0.3 + stormLayer3 * 0.3;
    density = smoothstep(0.3, 0.8, density);

    // Storm color: deep graphite -> slate blue, matching game palette
    vec3 darkCloud = vec3(0.02, 0.03, 0.07);
    vec3 stormCloud = vec3(0.06, 0.08, 0.14);
    vec3 lightEdge = vec3(0.10, 0.14, 0.22);

    vec3 color = mix(darkCloud, stormCloud, stormLayer1);
    color = mix(color, lightEdge, stormLayer2 * 0.3);

    // Wormhole glow at zenith -- purple, pulsing
    float zenithDist = length(pos.xz);
    float wormholeRadius = 0.25 + 0.08 * sin(uTime * 0.6);
    float wormholeGlow = smoothstep(wormholeRadius, 0.0, zenithDist);
    float wormholePulse = 0.5 + 0.5 * sin(uTime * 0.7);
    vec3 wormholeColor = vec3(0.25, 0.06, 0.40) * wormholeGlow * (0.4 + 0.6 * wormholePulse);

    // Only show wormhole in upper hemisphere
    wormholeColor *= smoothstep(0.0, 0.3, pos.y);

    // Lightning flash illumination in cloud layer
    float flashSeed = floor(uTime * 4.0);
    float flash = step(0.92, hash(vec3(flashSeed, 0.0, 0.0)));
    float flashAngle = hash(vec3(flashSeed, 1.0, 0.0)) * 6.28;
    float flashDir = smoothstep(1.8, 0.0, length(pos.xz - vec2(cos(flashAngle), sin(flashAngle)) * 0.5));
    vec3 flashColor = vec3(0.25, 0.35, 0.55) * flash * flashDir * 0.3;

    // Atmospheric fade at edges (fresnel)
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    float alpha = density * (0.6 + fresnel * 0.4);
    alpha *= smoothstep(0.0, 0.3, density);

    vec3 finalColor = color + wormholeColor + flashColor;

    gl_FragColor = vec4(finalColor, alpha * 0.85);
  }
`;

// --- Lightning Bolts (additive plane) ---

export const lightningVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;

  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

export const lightningFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uFlash;
  uniform vec2 uBoltStart;
  uniform vec2 uBoltEnd;
  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }

  float lightningBolt(vec2 uv, vec2 start, vec2 end, float time) {
    vec2 dir = normalize(end - start);
    vec2 perp = vec2(-dir.y, dir.x);
    float segLen = length(end - start);

    float t = dot(uv - start, dir) / segLen;
    float offset = dot(uv - start, perp);

    if (t < 0.0 || t > 1.0) return 0.0;

    // Jagged pattern from hash-based offsets at each segment
    float zigzag = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float segment = fract(t * 8.0 - fi);
      zigzag += (hash(fi + time * 0.1) - 0.5) * exp(-segment * 10.0) * 0.3;
    }

    float dist = abs(offset - zigzag);
    float bolt = exp(-dist * 60.0);     // sharp core
    bolt += exp(-dist * 15.0) * 0.3;    // soft glow

    return bolt * smoothstep(1.0, 0.0, abs(t * 2.0 - 1.0));
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;

    float bolt = 0.0;
    bolt += lightningBolt(uv, uBoltStart, uBoltEnd, uTime);
    bolt += lightningBolt(uv, uBoltStart + vec2(0.2, 0.1), uBoltEnd + vec2(-0.1, 0.2), uTime + 1.0) * 0.6;
    bolt += lightningBolt(uv, uBoltStart - vec2(0.15, 0.05), uBoltEnd - vec2(0.2, -0.1), uTime + 2.0) * 0.7;

    float intensity = bolt * uFlash;
    // Cyan-white lightning matching the game's signal color
    vec3 color = vec3(0.5, 0.85, 1.0) * intensity * 2.0;

    gl_FragColor = vec4(color, intensity);
  }
`;

// --- Globe with Ecumenopolis Growth ---

export const globeVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform mat4 world;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(world) * normal);
    vPosition = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

export const globeFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uGrowth;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d = hash(i + vec3(1.0, 1.0, 0.0));
    float e = hash(i + vec3(0.0, 0.0, 1.0));
    float f2 = hash(i + vec3(1.0, 0.0, 1.0));
    float g = hash(i + vec3(0.0, 1.0, 1.0));
    float h = hash(i + vec3(1.0, 1.0, 1.0));

    return mix(
      mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
      mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Procedural continent generation based on spherical coordinates
  float continentPattern(vec3 pos) {
    float lat = asin(pos.y);
    float lon = atan(pos.z, pos.x);
    float continents = 0.0;

    // North America
    continents += smoothstep(0.6, 0.3, distance(vec2(lon + 1.7, lat), vec2(-1.7, 0.7)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0));

    // South America
    continents += smoothstep(0.5, 0.2, distance(vec2(lon + 1.2, lat), vec2(-1.2, -0.4)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0 + vec3(10.0, 0.0, 0.0)));

    // Europe/Africa mass
    continents += smoothstep(0.7, 0.2, distance(vec2(lon, lat), vec2(0.2, 0.5)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0 + vec3(20.0, 0.0, 0.0)));

    continents += smoothstep(0.6, 0.2, distance(vec2(lon + 0.3, lat), vec2(0.3, -0.1)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0 + vec3(30.0, 0.0, 0.0)));

    // Asia
    continents += smoothstep(0.8, 0.3, distance(vec2(lon - 1.8, lat), vec2(1.8, 0.6)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0 + vec3(40.0, 0.0, 0.0)));

    // Australia
    continents += smoothstep(0.4, 0.15, distance(vec2(lon - 2.5, lat), vec2(2.5, -0.5)))
      * smoothstep(0.0, 0.4, fbm(pos * 8.0 + vec3(50.0, 0.0, 0.0)));

    return clamp(continents, 0.0, 1.0);
  }

  void main() {
    vec3 pos = normalize(vPosition);

    // Terrain: continents with coastal detail
    float landMask = continentPattern(pos);
    float coastDetail = fbm(pos * 15.0) * 0.3;
    landMask = smoothstep(0.4 - coastDetail, 0.5 + coastDetail, landMask);

    // Lattice growth: starts from land, then spreads to ocean platforms
    float latticePattern = fbm(pos * 6.0 + uTime * 0.03);
    float growth = smoothstep(0.0, 1.0, uGrowth);

    float latticeSpread = landMask * growth * 2.0;
    latticeSpread += (1.0 - landMask) * max(0.0, growth * 2.0 - 1.0);
    latticeSpread = clamp(latticeSpread, 0.0, 1.0);

    float latticeMask = smoothstep(0.3, 0.7, latticePattern + latticeSpread * 0.5) * latticeSpread;

    // Ocean colors: deep graphite-blue matching game palette
    vec3 deepOcean = vec3(0.01, 0.02, 0.06);
    vec3 shallowOcean = vec3(0.02, 0.04, 0.10);
    vec3 coastalWater = vec3(0.03, 0.07, 0.13);

    // Land colors: muted industrial greens/browns
    vec3 plains = vec3(0.10, 0.13, 0.07);
    vec3 forest = vec3(0.06, 0.10, 0.06);
    vec3 desert = vec3(0.15, 0.13, 0.09);

    // Machine lattice colors: the ecumenopolis palette
    vec3 latticeBase = vec3(0.09, 0.10, 0.13);
    vec3 latticeDense = vec3(0.14, 0.16, 0.21);
    vec3 latticeCore = vec3(0.20, 0.25, 0.35);
    vec3 latticeGlow = vec3(0.35, 0.75, 0.88);  // cyan-mint lattice lights

    // Ocean depth variation
    float oceanDepth = fbm(pos * 8.0);
    vec3 oceanColor = mix(deepOcean, shallowOcean, oceanDepth);
    oceanColor = mix(oceanColor, coastalWater, landMask * 0.3);

    // Land type variation
    float landType = fbm(pos * 5.0 + vec3(100.0, 0.0, 0.0));
    vec3 landColor = mix(forest, plains, smoothstep(0.3, 0.7, landType));
    landColor = mix(landColor, desert, smoothstep(0.7, 1.0, landType) * abs(pos.y));

    vec3 terrainColor = mix(oceanColor, landColor, landMask);

    // Progressive machine coverage
    vec3 machineColor = mix(latticeBase, latticeDense, latticePattern);
    machineColor = mix(machineColor, latticeCore, smoothstep(0.5, 1.0, latticeMask));

    vec3 color = mix(terrainColor, machineColor, latticeMask);

    // Lattice lights: pulsing grid pattern in dense areas
    float lightGrid = fbm(pos * 40.0 + uTime * 0.2);
    float lights = latticeMask * smoothstep(0.4, 0.6, lightGrid);
    lights *= (0.5 + 0.5 * sin(uTime * 2.0 + latticePattern * 30.0));
    lights *= smoothstep(0.3, 0.8, latticeMask);

    color += latticeGlow * lights * 0.6;

    // Atmospheric fresnel glow -- cyan/signal color at edges
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    vec3 atmosColor = mix(vec3(0.04, 0.12, 0.25), vec3(0.12, 0.22, 0.32), latticeMask);
    color += atmosColor * fresnel * 0.5;

    // Cloud shadows
    float clouds = fbm(pos * 10.0 + uTime * 0.1) * 0.1;
    color *= (1.0 - clouds * (1.0 - latticeMask * 0.8));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Hypercane Spiral Band ---

export const hypercaneVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform mat4 world;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vPosition = position;
    vNormal = normalize(mat3(world) * normal);
    vUv = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

export const hypercaneFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d = hash(i + vec3(1.0, 1.0, 0.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 pos = normalize(vPosition);
    float angle = atan(pos.z, pos.x);
    float radius = length(pos.xz);

    // Spiral rotation with turbulence
    float spiral = angle + radius * 3.0 - uTime * 2.0;
    float spiralPattern = sin(spiral * 8.0) * 0.5 + 0.5;
    float turb = fbm(pos * 4.0 + uTime * 0.5);

    float intensity = spiralPattern * turb;
    intensity *= smoothstep(0.0, 0.3, radius) * smoothstep(1.2, 0.8, radius);
    intensity *= smoothstep(-0.3, 0.3, pos.y);

    // Storm spiral colors: deep blue-gray with cyan-tinted edges
    vec3 stormColor = vec3(0.08, 0.10, 0.18);
    vec3 glowColor = vec3(0.18, 0.30, 0.45);
    vec3 color = mix(stormColor, glowColor, intensity * 0.4);

    float alpha = intensity * 0.35;

    gl_FragColor = vec4(color, alpha);
  }
`;
