import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { g as getCitySiteViewModel, s as surveyCitySite, f as foundCitySite, e as enterCityInstance, r as returnToWorld } from './poiActions-DqyDupab.js';
import { h as setCitySiteModalOpen } from './contracts-Exa9P0hv.js';
import { HudButton } from './HudButton-CEI_uBOF.js';
import './index-COtgIsy1.js';
import './cityPresentation-D5dFAzX3.js';
import './seed-BwjLk4HQ.js';
import './sectorCoordinates-Bm5lA-nC.js';
import './cityCatalog-DOxnPYXe.js';

function CitySiteModal({
  city,
  context,
  mode,
  onClose
}) {
  const viewModel = getCitySiteViewModel({ city, context, mode });
  const {
    actionFlowSummary,
    actions,
    cityStatus,
    cityStatusMeta,
    presentation
  } = viewModel;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-[#02050a]/72 pointer-events-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-full items-center justify-center px-4 py-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[760px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/95 shadow-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff] block", children: presentation.badge }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 font-mono text-[18px] md:text-[22px] uppercase tracking-[0.12em] text-[#edfaff] block", children: context.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 font-mono text-[12px] leading-5 text-white/46 m-0 mt-2", children: presentation.summary })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6 flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gap-4 md:flex-row flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Site Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-[12px] leading-5 text-white/58 m-0 mt-3", children: presentation.role })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Site State" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-3 font-mono text-[16px] uppercase tracking-[0.12em] text-[#dff6ff] block", children: cityStatus }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 font-mono text-[11px] leading-5 text-white/46 m-0 mt-2", children: cityStatusMeta })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block", children: "Action Flow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-[11px] leading-5 text-white/46 m-0 mt-3", children: actionFlowSummary })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between border-t border-white/8 bg-[#061019]/96 px-4 py-4 md:px-6 md:py-5 flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row flex-wrap gap-3", children: [
        actions.some((action) => action.id === "survey") && city && /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudButton,
          {
            label: presentation.surveyLabel,
            meta: "mark linked interior as surveyed",
            variant: "secondary",
            testID: "city-site-survey",
            onPress: () => {
              surveyCitySite(city.id);
              setCitySiteModalOpen(true, {
                ...context,
                discovered: true
              });
            }
          }
        ),
        actions.some((action) => action.id === "found") && city && /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudButton,
          {
            label: presentation.foundationLabel,
            meta: "establish substation and claim site",
            testID: "city-site-found",
            onPress: () => {
              foundCitySite(city.id);
              setCitySiteModalOpen(true, {
                ...context,
                cityInstanceId: city.id,
                discovered: true
              });
            }
          }
        ),
        actions.some((action) => action.id === "enter") && city && /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudButton,
          {
            label: presentation.enterLabel,
            meta: "transition into linked city",
            variant: "secondary",
            testID: "city-site-enter",
            onPress: () => {
              enterCityInstance(city.id);
              onClose();
            }
          }
        ),
        actions.some((action) => action.id === "return") && /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudButton,
          {
            label: "Return To World",
            meta: "restore outdoor scene",
            variant: "secondary",
            testID: "city-site-return",
            onPress: () => {
              returnToWorld();
              onClose();
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        HudButton,
        {
          label: "Close",
          meta: "dismiss interaction overlay",
          variant: "secondary",
          testID: "city-site-close",
          onPress: onClose
        }
      )
    ] })
  ] }) }) }) });
}

export { CitySiteModal };
//# sourceMappingURL=CitySiteModal-CHVpT2ze.js.map
