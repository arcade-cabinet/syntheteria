import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { s as seedToPhrase, r as randomSeed, p as phraseToSeed } from './seed-BwjLk4HQ.js';
import { c as createNewGameConfig, S as SECTOR_SCALE_SPECS, D as DIFFICULTY_LABELS, C as CLIMATE_PROFILE_SPECS, a as STORM_PROFILE_SPECS } from './config-DqmIuxQs.js';

function NewGameModal({
  visible,
  initialConfig,
  onCancel,
  onConfirm
}) {
  const closeRef = reactExports.useRef(null);
  const [phraseInput, setPhraseInput] = reactExports.useState(
    () => seedToPhrase(randomSeed())
  );
  const [parseError, setParseError] = reactExports.useState(false);
  const [sectorScale, setSectorScale] = reactExports.useState("standard");
  const [difficulty, setDifficulty] = reactExports.useState("standard");
  const [climateProfile, setClimateProfile] = reactExports.useState("temperate");
  const [stormProfile, setStormProfile] = reactExports.useState("volatile");
  reactExports.useEffect(() => {
    if (!visible) {
      return;
    }
    const nextConfig = initialConfig ?? createNewGameConfig(randomSeed());
    setPhraseInput(seedToPhrase(nextConfig.worldSeed));
    setSectorScale(nextConfig.sectorScale);
    setDifficulty(nextConfig.difficulty);
    setClimateProfile(nextConfig.climateProfile);
    setStormProfile(nextConfig.stormProfile);
    setParseError(false);
    const timer = setTimeout(() => {
      closeRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [initialConfig, visible]);
  if (!visible) {
    return null;
  }
  const confirm = () => {
    const seed = phraseToSeed(phraseInput);
    if (seed === null) {
      setParseError(true);
      return;
    }
    onConfirm({
      worldSeed: seed,
      sectorScale,
      difficulty,
      climateProfile,
      stormProfile
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "fixed inset-0 flex flex-col bg-[#010308]/88",
      role: "dialog",
      "aria-label": "Campaign Initialization",
      "aria-modal": true,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-start justify-center px-4 py-6 md:py-10 min-h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[1040px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/96 shadow-2xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row items-center justify-between border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]", children: "Campaign Initialization" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                ref: closeRef,
                onClick: onCancel,
                className: "h-9 w-9 flex items-center justify-center rounded-full border border-white/12 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff]",
                "aria-label": "Close",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[16px] text-white/60", children: "×" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[18px] md:rounded-[22px] border border-[#8be6ff]/16 bg-[#08131a]/80 px-4 py-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  id: "seed-label",
                  className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block",
                  children: "World Seed"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-row items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden rounded-[18px] border border-[#7fe5ff]/24 bg-[#02070d]/80", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    value: phraseInput,
                    onChange: (e) => {
                      setPhraseInput(e.target.value);
                      setParseError(false);
                    },
                    placeholder: "hollow-bright-forge",
                    autoCorrect: "off",
                    autoCapitalize: "none",
                    "aria-label": "World seed",
                    "aria-labelledby": "seed-label",
                    className: `px-4 py-3 font-mono text-sm tracking-[0.14em] bg-transparent w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] ${parseError ? "text-[#ffb0b0]" : "text-[#e6f6fb]"}`
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => {
                      setPhraseInput(seedToPhrase(randomSeed()));
                      setParseError(false);
                    },
                    "aria-label": "Randomize world seed",
                    className: "min-h-[44px] flex items-center justify-center rounded-[18px] border border-[#7fe5ff]/24 bg-[#0b1822] px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff]",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ed7e8]", children: "Randomize" })
                  }
                )
              ] }),
              parseError && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb0b0] block", children: "Use an `adj-adj-noun` seed or a raw integer." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4 md:gap-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Sector Scale" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "mt-3 flex flex-col gap-3",
                    role: "radiogroup",
                    "aria-label": "Sector Scale",
                    children: Object.entries(SECTOR_SCALE_SPECS).map(([value, spec]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OptionCard,
                      {
                        label: spec.label,
                        description: spec.description,
                        meta: `${spec.width} x ${spec.height} sectors`,
                        selected: sectorScale === value,
                        onPress: () => setSectorScale(value)
                      },
                      value
                    ))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Difficulty" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "mt-3 flex flex-col gap-3",
                    role: "radiogroup",
                    "aria-label": "Difficulty",
                    children: Object.keys(DIFFICULTY_LABELS).map(
                      (value) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        OptionCard,
                        {
                          label: DIFFICULTY_LABELS[value],
                          description: value === "story" ? "Lower pressure, softer infrastructure risk." : value === "hard" ? "Sharper scarcity, hostile pressure, harsher storms." : "Balanced intended progression.",
                          meta: value.toUpperCase(),
                          selected: difficulty === value,
                          onPress: () => setDifficulty(value)
                        },
                        value
                      )
                    )
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4 md:gap-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Climate Pattern" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "mt-3 flex flex-col gap-3",
                    role: "radiogroup",
                    "aria-label": "Climate Pattern",
                    children: Object.entries(CLIMATE_PROFILE_SPECS).map(([value, spec]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OptionCard,
                      {
                        label: spec.label,
                        description: spec.description,
                        meta: value.toUpperCase(),
                        selected: climateProfile === value,
                        onPress: () => setClimateProfile(value)
                      },
                      value
                    ))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Storm Intensity" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "mt-3 flex flex-col gap-3",
                    role: "radiogroup",
                    "aria-label": "Storm Intensity",
                    children: Object.entries(STORM_PROFILE_SPECS).map(([value, spec]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      OptionCard,
                      {
                        label: spec.label,
                        description: spec.description,
                        meta: value.toUpperCase(),
                        selected: stormProfile === value,
                        onPress: () => setStormProfile(value)
                      },
                      value
                    ))
                  }
                )
              ] })
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 border-t border-white/8 bg-[#061019]/98 px-4 py-3 md:px-6 md:py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full max-w-[1040px] flex flex-row items-center justify-end gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ActionButton, { label: "Cancel", tone: "ghost", onPress: onCancel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ActionButton,
            {
              label: "Generate World",
              tone: "primary",
              onPress: confirm,
              testID: "new-game-confirm"
            }
          )
        ] }) })
      ]
    }
  );
}
function OptionCard({
  label,
  description,
  meta,
  selected,
  onPress
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      onClick: onPress,
      role: "radio",
      "aria-checked": selected,
      "aria-label": `${label}: ${description}`,
      className: `min-h-[52px] overflow-hidden rounded-[18px] border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] w-full ${selected ? "border-[#8be6ff]/60 bg-[#0c2d42] shadow-lg shadow-[#8be6ff]/8" : "border-white/10 bg-[#09131b]/70"}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row items-center gap-2 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `h-3 w-3 rounded-full border flex-shrink-0 ${selected ? "border-[#8be6ff] bg-[#8be6ff]" : "border-white/20 bg-transparent"}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `font-mono text-[11px] uppercase tracking-[0.18em] block ${selected ? "text-[#e4f8ff]" : "text-white/70"}`,
                children: label
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 font-mono text-[11px] leading-5 text-white/48 block", children: description })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `rounded-full border px-3 py-1 flex-shrink-0 ${selected ? "border-[#8be6ff]/50 bg-[#8be6ff]/18" : "border-white/10 bg-white/5"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `font-mono text-[9px] uppercase tracking-[0.18em] ${selected ? "text-[#b8edff]" : "text-[#8ed7e8]/60"}`,
                children: meta
              }
            )
          }
        )
      ] })
    }
  );
}
function ActionButton({
  label,
  tone,
  onPress,
  testID
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      onClick: onPress,
      "aria-label": label,
      "data-testid": testID,
      className: `min-h-[44px] flex-1 md:flex-none flex items-center justify-center rounded-[16px] border px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] ${tone === "primary" ? "border-[#8be6ff]/42 bg-[#103244]" : "border-white/10 bg-[#0a1118]"}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: `font-mono text-[10px] uppercase tracking-[0.18em] ${tone === "primary" ? "text-[#def8ff]" : "text-white/68"}`,
          children: label
        }
      )
    }
  );
}

export { NewGameModal };
//# sourceMappingURL=NewGameModal-DqPM6vDQ.js.map
