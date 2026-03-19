precision mediump float;

uniform vec3  uSunDir;

varying vec2  vWorldXZ;
varying vec3  vWorldNormal;

// Three.js fog (injected automatically when fog:true on ShaderMaterial)
#include <fog_pars_fragment>

void main() {
  // Base terrain color — warm concrete under harsh overhead industrial light
  vec3 baseColor = vec3(0.55, 0.52, 0.48);

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
