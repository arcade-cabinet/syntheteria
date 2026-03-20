import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import './index-COtgIsy1.js';

function DiegeticChip({
  label,
  value,
  valueColor = "#d9fff3"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "diegetic-chip",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 8,
        background: "rgba(7, 17, 23, 0.9)",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 12
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: {
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            },
            children: label
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: valueColor }, children: String(value) })
      ]
    }
  );
}

export { DiegeticChip };
//# sourceMappingURL=DiegeticChip-B5GSop4O.js.map
