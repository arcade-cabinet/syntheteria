import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import './index-COtgIsy1.js';

const BUTTON_TONES = {
  primary: {
    border: "border-[#6ff3c8]/30",
    borderActive: "border-[#6ff3c8]/70",
    bg: "bg-[#071117]/92",
    bgActive: "bg-[#102a27]",
    text: "text-[#d8fff1]",
    meta: "text-[#6bd9bf]",
    accent: "bg-[#6ff3c8]"
  },
  secondary: {
    border: "border-[#89d9ff]/28",
    borderActive: "border-[#89d9ff]/65",
    bg: "bg-[#07111a]/92",
    bgActive: "bg-[#0c2533]",
    text: "text-[#dff6ff]",
    meta: "text-[#89d9ff]",
    accent: "bg-[#89d9ff]"
  },
  utility: {
    border: "border-[#f6c56a]/28",
    borderActive: "border-[#f6c56a]/65",
    bg: "bg-[#171107]/92",
    bgActive: "bg-[#332a0c]",
    text: "text-[#fff4de]",
    meta: "text-[#f6c56a]",
    accent: "bg-[#f6c56a]"
  },
  danger: {
    border: "border-[#ff8f7a]/30",
    borderActive: "border-[#ff8f7a]/70",
    bg: "bg-[#160a0b]/92",
    bgActive: "bg-[#351012]",
    text: "text-[#ffe3de]",
    meta: "text-[#ff9f8e]",
    accent: "bg-[#ff8f7a]"
  }
};
function HudButton({
  label,
  onPress,
  active = false,
  disabled = false,
  className = "",
  variant = "primary",
  icon,
  meta,
  testID
}) {
  const tone = BUTTON_TONES[variant];
  const borderClass = disabled ? "border-white/10" : active ? tone.borderActive : tone.border;
  const bgClass = disabled ? "bg-[#11161b]/70" : active ? tone.bgActive : tone.bg;
  const textClass = disabled ? "text-white/25" : tone.text;
  const metaClass = disabled ? "text-white/20" : tone.meta;
  const accentClass = disabled ? "bg-white/15" : tone.accent;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onPress,
      disabled,
      "data-testid": testID,
      "aria-label": meta ? `${label}: ${meta}` : label,
      "aria-disabled": disabled,
      className: `relative min-h-[52px] overflow-hidden rounded-[18px] border ${borderClass} ${bgClass} px-3 py-2 text-left active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fe5ff] ${className}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 rounded-[18px] border border-white/5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute left-0 top-0 h-full w-1.5 ${accentClass}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row items-center gap-3", children: [
          icon && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/5", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `font-mono text-[11px] uppercase tracking-[0.18em] ${textClass}`,
                children: label
              }
            ),
            meta && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `mt-1 block font-mono text-[10px] ${metaClass}`, children: meta })
          ] })
        ] })
      ]
    }
  );
}

export { HudButton };
//# sourceMappingURL=HudButton-CEI_uBOF.js.map
