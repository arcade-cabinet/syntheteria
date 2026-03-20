import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { d as useFrame, u as useThree, O as OrthographicCamera, C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { r as reactExports } from './index-COtgIsy1.js';

function ReadyBeacon({ onReady }) {
  const fired = reactExports.useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      requestAnimationFrame(() => onReady());
    }
  });
  return null;
}
function OrthoRig({
  position,
  lookAt,
  zoom
}) {
  const { camera, gl } = useThree();
  reactExports.useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.position.set(...position);
      camera.zoom = zoom;
      camera.lookAt(...lookAt);
      camera.updateProjectionMatrix();
    }
  }, [camera, gl, position, lookAt, zoom]);
  return null;
}
function TestCanvasWrapper({
  width = 800,
  height = 600,
  cameraPosition = [0, 20, 0],
  cameraLookAt = [0, 0, 0],
  cameraZoom = 40,
  backgroundColor = "#03070d",
  children
}) {
  const [ready, setReady] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        width,
        height,
        position: "relative",
        background: backgroundColor,
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Canvas,
          {
            orthographic: true,
            camera: {
              position: cameraPosition,
              zoom: cameraZoom,
              near: 0.1,
              far: 500
            },
            style: { position: "absolute", inset: 0 },
            frameloop: "always",
            gl: { preserveDrawingBuffer: true },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("color", { attach: "background", args: [backgroundColor] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                OrthoRig,
                {
                  position: cameraPosition,
                  lookAt: cameraLookAt,
                  zoom: cameraZoom
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 1.2, color: 11584982 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("hemisphereLight", { args: [11131135, 1516333, 0.9] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "directionalLight",
                {
                  position: [8, 16, 10],
                  intensity: 2,
                  color: 16777215
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ReadyBeacon, { onReady: () => setReady(true) }),
              children
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-testid": "canvas-status",
            style: {
              position: "absolute",
              left: 8,
              bottom: 8,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.7)",
              color: ready ? "#6ff3c8" : "#ff9cb5",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderRadius: 6
            },
            children: ready ? "Ready" : "Rendering"
          }
        )
      ]
    }
  );
}

export { TestCanvasWrapper as T };
//# sourceMappingURL=testCanvasWrapper-CLb_wOTZ.js.map
