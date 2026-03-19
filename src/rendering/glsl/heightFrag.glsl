precision mediump float;

uniform vec3  uSunDir;

varying vec2  vWorldXZ;
varying vec3  vWorldNormal;
varying float vFloorIndex;

// Three.js fog (injected automatically when fog:true on ShaderMaterial)
#include <fog_pars_fragment>

// Per-biome color tints — indexed by floorIndex (0-8).
// Warm industrial palette: each district has a distinct character.
//   0: structural_mass — dark impassable structure
//   1: durasteel_span  — clean metallic walkways
//   2: transit_deck    — standard grey decking
//   3: collapsed_zone  — rusted, broken areas
//   4: dust_district   — sandy, worn surfaces
//   5: bio_district    — overgrown, greenish tint
//   6: aerostructure   — elevated, blue-grey platforms
//   7: abyssal_platform — dark, deep chasms
//   8: void_pit        — pure void, near-black
vec3 biomeColor(float idx) {
  int i = int(idx + 0.5);
  if (i == 0) return vec3(0.25, 0.22, 0.20); // structural_mass — dark concrete
  if (i == 1) return vec3(0.60, 0.58, 0.55); // durasteel_span — bright steel
  if (i == 2) return vec3(0.52, 0.50, 0.47); // transit_deck — neutral grey
  if (i == 3) return vec3(0.58, 0.42, 0.32); // collapsed_zone — rusted orange
  if (i == 4) return vec3(0.62, 0.55, 0.40); // dust_district — sandy tan
  if (i == 5) return vec3(0.38, 0.52, 0.38); // bio_district — mossy green
  if (i == 6) return vec3(0.45, 0.48, 0.56); // aerostructure — blue-grey
  if (i == 7) return vec3(0.22, 0.24, 0.30); // abyssal_platform — deep blue-black
  return vec3(0.10, 0.10, 0.12);              // void_pit — near-black
}

void main() {
  // Per-biome base color from floor type
  vec3 baseColor = biomeColor(vFloorIndex);

  // Elevation tint — higher surfaces get darker, cooler tones (rusted steel feel)
  // vWorldNormal.y > 0.9 means it's a flat top surface; use position-derived height
  float elevFactor = clamp(vWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
  // Bridges/platforms at higher Y get a blue-grey industrial steel tint
  float heightProxy = clamp((1.0 - elevFactor) * 2.0, 0.0, 1.0);
  vec3 elevatedColor = vec3(0.42, 0.44, 0.50); // blue-grey steel
  baseColor = mix(baseColor, elevatedColor, heightProxy * 0.6);

  // Bright directional lighting — perpetual artificial daylight from dome zenith
  float NdotL = max(dot(normalize(vWorldNormal), normalize(uSunDir)), 0.0);
  vec3 lit = baseColor * (0.70 + 0.50 * NdotL);
  // Reinhard tone-map: high burn preserves midtones, only compresses highlights
  vec3 color = lit / (lit + vec3(1.6));

  gl_FragColor = vec4(color, 1.0);

  // Apply Three.js scene fog (fogExp2)
  #include <fog_fragment>
}
