/**
 * Perpetual storm sky with pulsating wormhole effect.
 * Simple implementation using a dark dome with animated colors.
 */
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export function StormSky() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh>
      <sphereGeometry args={[200, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        uniforms={{
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec3 vPosition;

          // Simple noise function
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          void main() {
            vec3 dir = normalize(vPosition);

            // Storm cloud layer
            float n1 = noise(dir.xz * 3.0 + uTime * 0.1);
            float n2 = noise(dir.xz * 6.0 - uTime * 0.15);
            float n3 = noise(dir.xz * 12.0 + uTime * 0.2);
            float stormPattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

            // Dark storm colors
            vec3 darkCloud = vec3(0.02, 0.02, 0.04);
            vec3 lightCloud = vec3(0.08, 0.06, 0.12);
            vec3 stormColor = mix(darkCloud, lightCloud, stormPattern);

            // Wormhole glow at zenith
            float zenithDist = length(dir.xz);
            float wormholeGlow = smoothstep(0.3, 0.0, zenithDist);
            float pulse = 0.5 + 0.5 * sin(uTime * 0.8);
            vec3 wormholeColor = vec3(0.3, 0.1, 0.5) * wormholeGlow * (0.5 + 0.5 * pulse);

            // Lightning flashes (random)
            float flash = step(0.997, hash(vec2(floor(uTime * 4.0), 0.0)));
            vec3 flashColor = vec3(0.6, 0.7, 1.0) * flash * 0.3;

            gl_FragColor = vec4(stormColor + wormholeColor + flashColor, 1.0);
          }
        `}
      />
    </mesh>
  )
}
