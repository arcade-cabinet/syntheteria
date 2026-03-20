import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';

const LOADING_STAGES = [
  "Encoding sector lattice",
  "Anchoring relay spines",
  "Seeding structural districts",
  "Mapping storm pressure corridors",
  "Committing to distributed archive"
];
function LoadingOverlay({ label }) {
  const [stageIndex, setStageIndex] = reactExports.useState(0);
  const [progressPercent, setProgressPercent] = reactExports.useState(20);
  const [glowVisible, setGlowVisible] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        const next = Math.min(prev + 1, LOADING_STAGES.length - 1);
        setProgressPercent((next + 1) / LOADING_STAGES.length * 100);
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);
  reactExports.useEffect(() => {
    const interval = setInterval(() => {
      setGlowVisible((v) => !v);
    }, 1600);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-[#020307]/55", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-center",
      style: { maxWidth: 480, width: "100%" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "animate-spin",
            style: {
              width: 80,
              height: 80,
              borderRadius: "50%",
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "rgba(139, 230, 255, 0.2)",
              borderTopColor: "#8be6ff"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "mt-8 font-mono text-center uppercase",
            style: {
              fontSize: 28,
              letterSpacing: 4,
              color: "#8be6ff",
              textTransform: "uppercase",
              textShadow: "0 0 16px rgba(139, 230, 255, 0.5)"
            },
            children: label
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "mt-3 font-mono text-center uppercase transition-opacity duration-700",
            style: {
              fontSize: 11,
              letterSpacing: 3,
              color: "rgba(139, 230, 255, 0.55)",
              opacity: glowVisible ? 0.8 : 0.4
            },
            children: LOADING_STAGES[stageIndex]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "mt-6 overflow-hidden rounded-full",
            style: {
              width: "80%",
              height: 6,
              backgroundColor: "rgba(139, 230, 255, 0.08)",
              border: "1px solid rgba(139, 230, 255, 0.12)"
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "h-full rounded-full transition-all duration-500 bg-[#8be6ff]/70",
                style: { width: `${progressPercent}%` }
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-row items-center justify-center gap-2", children: LOADING_STAGES.map((stage, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: i <= stageIndex ? "#8be6ff" : "rgba(255, 255, 255, 0.1)"
            }
          },
          stage
        )) })
      ]
    }
  ) });
}

export { LoadingOverlay };
//# sourceMappingURL=LoadingOverlay-qWcy2Lrd.js.map
