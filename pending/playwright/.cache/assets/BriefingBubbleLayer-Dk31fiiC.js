import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { u as units, U as Unit, W as WorldPosition, a4 as BOT_SPEECH_LABELS, j as getBotCommandProfile, e as subscribeRuntimeState, g as getRuntimeState, f as getActiveWorldSession, h as setCitySiteModalOpen } from './contracts-Exa9P0hv.js';
import { g as getActiveLocationContext } from './locationContext-Cp3DEtpX.js';

function getSelectedUnitBubble() {
  const selectedUnit = Array.from(units).find(
    (unit2) => unit2.get(Unit)?.selected
  );
  if (!selectedUnit) {
    return null;
  }
  const unit = selectedUnit.get(Unit);
  const position = selectedUnit.get(WorldPosition);
  if (!unit || !position) {
    return null;
  }
  const speechLabel = BOT_SPEECH_LABELS[unit.speechProfile];
  const commandProfile = getBotCommandProfile(unit.type);
  return {
    id: `unit:${unit.displayName}`,
    title: speechLabel,
    body: `${unit.displayName} standing by at X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}. ${commandProfile.roleBrief} Priority: ${commandProfile.tutorialPrompt}`,
    tone: "mint",
    anchor: "selected-unit",
    screenHint: "top-left"
  };
}
function getActiveBriefingBubbles(args) {
  const { runtime, session } = args;
  const bubbles = [];
  const unitBubble = getSelectedUnitBubble();
  if (unitBubble) {
    bubbles.push(unitBubble);
  }
  const { activeCity, poi, presentation } = getActiveLocationContext({
    activeCityInstanceId: runtime.activeCityInstanceId,
    activeScene: runtime.activeScene,
    nearbyPoi: runtime.nearbyPoi,
    session
  });
  if (poi) {
    bubbles.push({
      id: `poi:${poi.id}`,
      title: presentation?.badge ?? poi.name,
      body: presentation?.summary ?? (activeCity ? `${activeCity.name} remains linked to this sector. Use the radial or site brief to inspect or extend local capabilities.` : `${poi.name} is within relay range. Survey and reclamation actions are available.`),
      tone: runtime.activeScene === "city" ? "signal" : "amber",
      anchor: runtime.activeScene === "city" ? "active-site" : "nearby-site",
      screenHint: unitBubble ? "top-right" : "top-center"
    });
  }
  return bubbles.slice(0, 2);
}

function positionClass(screenHint) {
  switch (screenHint) {
    case "top-left":
      return "self-start";
    case "top-right":
      return "self-end";
    case "top-center":
    default:
      return "self-center";
  }
}
function toneStyle(tone) {
  switch (tone) {
    case "mint":
      return {
        borderColor: "rgba(111, 243, 200, 0.28)",
        eyebrowColor: "#6ff3c8"
      };
    case "amber":
      return {
        borderColor: "rgba(246, 197, 106, 0.28)",
        eyebrowColor: "#f6c56a"
      };
    case "crimson":
      return {
        borderColor: "rgba(255, 143, 143, 0.28)",
        eyebrowColor: "#ff8f8f"
      };
    case "signal":
    default:
      return {
        borderColor: "rgba(139, 230, 255, 0.28)",
        eyebrowColor: "#8be6ff"
      };
  }
}
function BriefingBubbleLayer() {
  const runtime = reactExports.useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
  const bubbles = getActiveBriefingBubbles({
    runtime,
    session: getActiveWorldSession()
  });
  if (bubbles.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "absolute left-0 right-0 flex flex-col gap-2 px-4",
      style: { bottom: 80, pointerEvents: "none" },
      children: bubbles.map((bubble) => {
        const tone = toneStyle(bubble.tone);
        const canOpenSiteBrief = bubble.anchor === "nearby-site" || bubble.anchor === "active-site";
        const posClass = positionClass(bubble.screenHint);
        const bubbleContent = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "block font-mono text-[10px] uppercase tracking-[0.22em]",
              style: { color: tone.eyebrowColor },
              children: bubble.title
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-2 font-mono text-[11px] leading-[18px]",
              style: { color: "rgba(255, 255, 255, 0.76)" },
              children: bubble.body
            }
          )
        ] });
        if (!canOpenSiteBrief) {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "data-testid": `briefing-bubble-${bubble.anchor}`,
              className: `max-w-[300px] rounded-xl px-3 py-2 z-20 ${posClass}`,
              style: {
                backgroundColor: "rgba(7, 17, 27, 0.85)",
                border: `1px solid ${tone.borderColor}`,
                boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.3)",
                pointerEvents: "none"
              },
              children: bubbleContent
            },
            bubble.id
          );
        }
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-testid": `briefing-bubble-${bubble.anchor}`,
            onClick: () => setCitySiteModalOpen(true, runtime.nearbyPoi),
            className: `max-w-[300px] rounded-xl px-3 py-2 z-20 text-left ${posClass}`,
            style: {
              backgroundColor: "rgba(7, 17, 27, 0.85)",
              border: `1px solid ${tone.borderColor}`,
              boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.3)",
              pointerEvents: "auto"
            },
            children: bubbleContent
          },
          bubble.id
        );
      })
    }
  );
}

export { BriefingBubbleLayer as B };
//# sourceMappingURL=BriefingBubbleLayer-Dk31fiiC.js.map
