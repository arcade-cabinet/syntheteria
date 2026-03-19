import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { b as getCityModelById } from './cityCatalog-DOxnPYXe.js';
import { C as CityModelMesh } from './CityModelMesh-4r60Iq1p.js';

const wallModel = getCityModelById("walls_wall_1");
const columnModel = getCityModelById("column_1");
const doorModel = getCityModelById("door_single");
function ModelProbePreview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        width: 1200,
        height: 800,
        background: "linear-gradient(180deg, #20313b 0%, #0d151d 100%)"
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Canvas, { camera: { position: [0, 7, 10], fov: 42 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("color", { attach: "background", args: ["#0d151d"] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 1.3, color: 11584982 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("hemisphereLight", { args: [11131135, 1516333, 1.1] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "directionalLight",
          {
            position: [8, 16, 10],
            intensity: 2.1,
            color: 16777215
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "directionalLight",
          {
            position: [-6, 9, -5],
            intensity: 1.2,
            color: 9168639
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "mesh",
          {
            rotation: [-Math.PI / 2, 0, 0],
            position: [0, -0.02, 0],
            receiveShadow: true,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [18, 18] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "meshStandardMaterial",
                {
                  color: 4938854,
                  roughness: 0.9,
                  metalness: 0.06
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: null, children: [
          wallModel ? /* @__PURE__ */ jsxRuntimeExports.jsx("group", { position: [-3.5, 0, 0], children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityModelMesh, { model: wallModel, targetSpan: 4 }) }) : null,
          columnModel ? /* @__PURE__ */ jsxRuntimeExports.jsx("group", { position: [0, 0, 0], children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityModelMesh, { model: columnModel, targetSpan: 3 }) }) : null,
          doorModel ? /* @__PURE__ */ jsxRuntimeExports.jsx("group", { position: [3.5, 0, 0], children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityModelMesh, { model: doorModel, targetSpan: 4 }) }) : null
        ] })
      ] })
    }
  );
}

export { ModelProbePreview };
//# sourceMappingURL=ModelProbePreview-BGvP1ecN.js.map
