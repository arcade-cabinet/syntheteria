import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { HudButton } from './HudButton-CEI_uBOF.js';
import { s as selectZoneModel, C as CITY_MODELS, g as getCityComposites, a as getCityCatalogSubcategories, f as filterCityModels } from './cityCatalog-DOxnPYXe.js';
import { F as FLOOR_MATERIAL_PRESETS } from './floorMaterialPresets-LMzl77Ms.js';

const PANEL_TONES = {
  default: {
    border: "border-[#6ff3c8]/25",
    header: "bg-[#6ff3c8]/10",
    glow: "bg-[#6ff3c8]/12",
    title: "text-[#d9fff3]",
    eyebrow: "text-[#7ee7cb]"
  },
  signal: {
    border: "border-[#8be6ff]/22",
    header: "bg-[#8be6ff]/10",
    glow: "bg-[#8be6ff]/10",
    title: "text-[#edfaff]",
    eyebrow: "text-[#90ddec]"
  },
  warning: {
    border: "border-[#f7c76d]/30",
    header: "bg-[#f7c76d]/12",
    glow: "bg-[#f7c76d]/12",
    title: "text-[#fff0c9]",
    eyebrow: "text-[#f6c56a]"
  },
  danger: {
    border: "border-[#ff7a7a]/30",
    header: "bg-[#ff7a7a]/12",
    glow: "bg-[#ff7a7a]/10",
    title: "text-[#ffe0e0]",
    eyebrow: "text-[#ff8f8f]"
  }
};
function HudPanel({
  title,
  eyebrow,
  children,
  className = "",
  variant = "default"
}) {
  const tone = PANEL_TONES[variant];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "region",
      "aria-label": title ?? eyebrow ?? "HUD panel",
      className: `relative overflow-hidden rounded-[22px] border ${tone.border} bg-[#081017]/88 shadow-2xl ${className}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute inset-x-0 top-0 h-20 ${tone.glow}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 border border-white/5 rounded-[22px]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative px-4 pt-3 pb-3", children: [
          (eyebrow || title) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: `mb-3 rounded-2xl border border-white/[0.08] ${tone.header} px-3 py-2`,
              children: [
                eyebrow && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `block font-mono text-[10px] uppercase tracking-[0.24em] ${tone.eyebrow}`,
                    children: eyebrow
                  }
                ),
                title && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `mt-1 block font-mono text-base uppercase tracking-[0.18em] ${tone.title}`,
                    children: title
                  }
                )
              ]
            }
          ),
          children
        ] })
      ]
    }
  );
}

function requireModelId(id, description) {
  if (!id) {
    throw new Error(
      `Missing city model for scenario requirement: ${description}`
    );
  }
  return id;
}
function buildCityLayoutScenarios() {
  const corridorFloor = requireModelId(
    selectZoneModel("corridor", "floor", ["hallway"])?.id ?? selectZoneModel("corridor", "floor")?.id,
    "corridor floor"
  );
  const roomFloor = requireModelId(
    selectZoneModel("storage", "floor")?.id,
    "room floor"
  );
  const wall = requireModelId(selectZoneModel("core", "wall")?.id, "wall");
  const door = requireModelId(
    selectZoneModel("fabrication", "door")?.id,
    "door"
  );
  const roof = requireModelId(selectZoneModel("power", "roof")?.id, "roof");
  const prop = requireModelId(
    selectZoneModel("fabrication", "prop")?.id,
    "prop"
  );
  const detail = requireModelId(
    selectZoneModel("corridor", "detail")?.id,
    "detail"
  );
  return [
    {
      id: "minimal_base",
      label: "Minimal Base",
      description: "Single-room operational shell with a corridor entry.",
      gridWidth: 3,
      gridHeight: 3,
      cellSize: 2,
      placements: [
        {
          modelId: corridorFloor,
          cellX: 1,
          cellY: 2,
          layer: "floor",
          rotationQuarterTurns: 0
        },
        {
          modelId: roomFloor,
          cellX: 1,
          cellY: 1,
          layer: "floor",
          rotationQuarterTurns: 0
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "north",
          rotationQuarterTurns: 0
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "east",
          rotationQuarterTurns: 1
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "west",
          rotationQuarterTurns: 3
        },
        {
          modelId: door,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "south",
          rotationQuarterTurns: 2
        },
        {
          modelId: roof,
          cellX: 1,
          cellY: 1,
          layer: "roof",
          rotationQuarterTurns: 0
        },
        {
          modelId: prop,
          cellX: 1,
          cellY: 1,
          layer: "prop",
          rotationQuarterTurns: 0
        }
      ]
    },
    {
      id: "corridor_facility",
      label: "Corridor Facility",
      description: "Longer circulation spine with utility detail accents.",
      gridWidth: 5,
      gridHeight: 3,
      cellSize: 2,
      placements: [
        ...Array.from({ length: 5 }, (_, index) => ({
          modelId: corridorFloor,
          cellX: index,
          cellY: 1,
          layer: "floor",
          rotationQuarterTurns: 0
        })),
        {
          modelId: detail,
          cellX: 1,
          cellY: 1,
          layer: "detail",
          rotationQuarterTurns: 0
        },
        {
          modelId: detail,
          cellX: 3,
          cellY: 1,
          layer: "detail",
          rotationQuarterTurns: 2
        },
        {
          modelId: roomFloor,
          cellX: 2,
          cellY: 0,
          layer: "floor",
          rotationQuarterTurns: 0
        },
        {
          modelId: door,
          cellX: 2,
          cellY: 0,
          layer: "structure",
          edge: "south",
          rotationQuarterTurns: 2
        },
        {
          modelId: wall,
          cellX: 2,
          cellY: 0,
          layer: "structure",
          edge: "north",
          rotationQuarterTurns: 0
        },
        {
          modelId: roof,
          cellX: 2,
          cellY: 0,
          layer: "roof",
          rotationQuarterTurns: 0
        }
      ]
    },
    {
      id: "storage_block",
      label: "Storage Block",
      description: "Compact storage room using cargo door logic.",
      gridWidth: 3,
      gridHeight: 3,
      cellSize: 2,
      placements: [
        {
          modelId: roomFloor,
          cellX: 1,
          cellY: 1,
          layer: "floor",
          rotationQuarterTurns: 0
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "north",
          rotationQuarterTurns: 0
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "east",
          rotationQuarterTurns: 1
        },
        {
          modelId: wall,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "west",
          rotationQuarterTurns: 3
        },
        {
          modelId: door,
          cellX: 1,
          cellY: 1,
          layer: "structure",
          edge: "south",
          rotationQuarterTurns: 2
        },
        {
          modelId: prop,
          cellX: 1,
          cellY: 1,
          layer: "prop",
          rotationQuarterTurns: 1
        },
        {
          modelId: roof,
          cellX: 1,
          cellY: 1,
          layer: "roof",
          rotationQuarterTurns: 0
        }
      ]
    }
  ];
}
const CITY_LAYOUT_SCENARIOS = buildCityLayoutScenarios();

const CITY_FAMILY_FILTERS = [
  "all",
  "floor",
  "wall",
  "door",
  "roof",
  "prop",
  "detail",
  "column",
  "stair",
  "utility"
];
const CITY_PLACEMENT_FILTERS = [
  "all",
  "cell",
  "edge",
  "corner",
  "roof",
  "prop",
  "detail",
  "vertical"
];
function getCityDirectoryPath(model) {
  const parts = model.sourceAssetPath.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
}
function formatCitySubcategoryLabel(value) {
  return value.replace(/^city\//, "").replace(/\//g, " / ");
}
function deriveCitySnapClass(model) {
  if (model.placementType === "vertical" || model.family === "stair" || model.passabilityEffect === "vertical_connector") {
    return "vertical_connector";
  }
  if (model.family === "door" || model.passabilityEffect === "portal") {
    return "portal_edge";
  }
  if (model.family === "wall" || model.placementType === "edge") {
    return "edge_wall";
  }
  if (model.family === "roof" || model.placementType === "roof") {
    return "roof_cap";
  }
  if (model.placementType === "corner") {
    return "corner_cap";
  }
  if (model.family === "detail" || model.placementType === "detail") {
    return "detail_overlay";
  }
  if (model.family === "prop" || model.placementType === "prop") {
    return "prop_insert";
  }
  return "floor_cell";
}
function deriveCityPassabilityClass(passabilityEffect) {
  switch (passabilityEffect) {
    case "walkable":
      return "passable";
    case "portal":
      return "transitional";
    case "vertical_connector":
      return "vertical";
    case "cover":
    case "guidance":
      return "support";
    case "blocking":
    default:
      return "impassable";
  }
}
function deriveCityStructuralRole(model) {
  if (model.family === "door" || model.passabilityEffect === "portal") {
    return "portal";
  }
  if (model.family === "wall" || model.passabilityEffect === "blocking") {
    return "barrier";
  }
  if (model.family === "column") {
    return "column";
  }
  if (model.family === "stair" || model.passabilityEffect === "vertical_connector") {
    return "stair";
  }
  if (model.family === "roof") {
    return "roof";
  }
  if (model.family === "detail") {
    return "detail";
  }
  if (model.family === "prop") {
    return "prop";
  }
  if (model.family === "utility") {
    return "utility";
  }
  if (model.passabilityEffect === "cover") {
    return "cover";
  }
  return "surface";
}
function deriveCityFootprintClass(model) {
  const span = Math.max(
    model.footprint.width,
    model.footprint.depth,
    model.bounds.width,
    model.bounds.depth
  );
  const height = Math.max(model.footprint.height, model.bounds.height);
  if (height >= 3.5) {
    return "tower";
  }
  if (span >= 2.1) {
    return "large";
  }
  if (span >= 1.2) {
    return "medium";
  }
  return "compact";
}
function summarizeCityModel(model) {
  const snapClass = deriveCitySnapClass(model);
  const passabilityClass = deriveCityPassabilityClass(model.passabilityEffect);
  const structuralRole = deriveCityStructuralRole(model);
  const footprintClass = deriveCityFootprintClass(model);
  const height = Math.max(model.footprint.height, model.bounds.height);
  const heightClass = height >= 3.5 ? "tall" : height >= 1.5 ? "mid" : "low";
  const rotationPolicy = model.rotationSymmetry === 1 ? "locked" : model.rotationSymmetry === 2 ? "opposed" : "quarter_turn";
  const composable = model.compositeEligibility.length > 0 || model.family === "wall" || model.family === "door" || model.family === "column" || model.family === "roof";
  return {
    id: model.id,
    label: model.label,
    directory: getCityDirectoryPath(model),
    footprintClass,
    heightClass,
    snapClass,
    passabilityClass,
    structuralRole,
    composable,
    rotationPolicy,
    summary: `${model.family} in ${formatCitySubcategoryLabel(model.subcategory)} with ${snapClass} behavior, ${passabilityClass} passability, and ${footprintClass} footprint.`
  };
}
function buildCityDirectorySummaries(models = CITY_MODELS) {
  const grouped = /* @__PURE__ */ new Map();
  for (const model of models) {
    const directory = getCityDirectoryPath(model);
    const current = grouped.get(directory) ?? [];
    current.push(model);
    grouped.set(directory, current);
  }
  return Array.from(grouped.entries()).map(([directory, entries]) => {
    const understandings = entries.map(summarizeCityModel);
    return {
      directory,
      modelCount: entries.length,
      families: Array.from(
        new Set(entries.map((entry) => entry.family))
      ).sort(),
      composableCount: understandings.filter((entry) => entry.composable).length,
      passabilityClasses: Array.from(
        new Set(understandings.map((entry) => entry.passabilityClass))
      ).sort(),
      snapClasses: Array.from(
        new Set(understandings.map((entry) => entry.snapClass))
      ).sort()
    };
  }).sort((left, right) => left.directory.localeCompare(right.directory));
}
function summarizeComposite(composite, models = CITY_MODELS) {
  const modelLookup = new Map(models.map((model) => [model.id, model]));
  return {
    id: composite.id,
    label: composite.label,
    gameplayRole: composite.gameplayRole,
    partCount: composite.parts.length,
    families: Array.from(
      new Set(
        composite.parts.map((part) => modelLookup.get(part.modelId)?.family).filter((family) => Boolean(family))
      )
    ).sort()
  };
}
function summarizeScenarioSet() {
  return CITY_LAYOUT_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    description: scenario.description,
    grid: `${scenario.gridWidth}x${scenario.gridHeight}`,
    layers: Array.from(
      new Set(scenario.placements.map((placement) => placement.layer))
    ).sort(),
    placementCount: scenario.placements.length
  }));
}
function buildCityUnderstandingSnapshot() {
  return {
    directories: buildCityDirectorySummaries(),
    models: CITY_MODELS.map(summarizeCityModel),
    subcategories: getCityCatalogSubcategories().map(
      formatCitySubcategoryLabel
    ),
    composites: getCityComposites().map(
      (composite) => summarizeComposite(composite)
    ),
    scenarios: summarizeScenarioSet()
  };
}

function createDefaultCityKitLabFilterState() {
  return {
    compositableOnly: false,
    family: "all",
    placementType: "all",
    subcategory: "all"
  };
}
function getCityKitLabFilterOptions() {
  return {
    familyFilters: CITY_FAMILY_FILTERS,
    placementFilters: CITY_PLACEMENT_FILTERS,
    subcategories: ["all", ...getCityCatalogSubcategories()]
  };
}
function getCityKitLabViewModel(filter) {
  return {
    directorySummaries: buildCityDirectorySummaries(),
    filterOptions: getCityKitLabFilterOptions(),
    floorPresets: FLOOR_MATERIAL_PRESETS,
    models: filterCityModels(filter),
    composites: getCityComposites(),
    scenarios: summarizeScenarioSet()
  };
}

function FilterChip({
  active,
  label,
  onPress
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: onPress,
      className: `min-h-[36px] flex items-center justify-center rounded-full border px-4 py-2 ${active ? "border-[#89d9ff]/70 bg-[#0f2b35]" : "border-white/10 bg-white/[0.03]"}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: `font-mono text-[10px] uppercase tracking-[0.16em] ${active ? "text-[#dff7ff]" : "text-white/50"}`,
          children: label
        }
      )
    }
  );
}
function ModelCard({
  model,
  cardWidth
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-[22px] border border-white/10 bg-[#071117]/88 p-3",
      style: { width: cardWidth },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: model.previewAsset,
            alt: model.label,
            style: {
              width: "100%",
              height: cardWidth * 0.67,
              borderRadius: 14,
              objectFit: "contain"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-3 block font-mono text-[11px] uppercase tracking-[0.12em] text-white/80", children: model.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#89d9ff]", children: [
          model.family,
          " · ",
          model.placementType
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[10px] leading-4 text-white/45", children: formatCitySubcategoryLabel(model.subcategory) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block font-mono text-[10px] leading-4 text-white/40", children: `bias: ${model.adjacencyBias.join(", ")}` })
      ]
    }
  );
}
function CityKitLab({
  initialFilterState,
  onClose
}) {
  const vw = window.innerWidth;
  const defaultFilterState = reactExports.useMemo(
    () => ({
      ...createDefaultCityKitLabFilterState(),
      ...initialFilterState
    }),
    [initialFilterState]
  );
  const [family, setFamily] = reactExports.useState(
    defaultFilterState.family
  );
  const [placementType, setPlacementType] = reactExports.useState(
    defaultFilterState.placementType
  );
  const [subcategory, setSubcategory] = reactExports.useState(
    defaultFilterState.subcategory
  );
  const [compositableOnly, setCompositableOnly] = reactExports.useState(
    defaultFilterState.compositableOnly
  );
  const {
    composites,
    directorySummaries,
    filterOptions: { familyFilters, placementFilters, subcategories },
    floorPresets,
    models,
    scenarios
  } = reactExports.useMemo(
    () => getCityKitLabViewModel({
      compositableOnly,
      family,
      placementType,
      subcategory
    }),
    [compositableOnly, family, placementType, subcategory]
  );
  const padding = vw < 768 ? 14 : 20;
  const cardGap = vw < 768 ? 10 : 12;
  const availableWidth = vw - padding * 2;
  const columnsPerRow = vw < 480 ? 2 : vw < 768 ? 3 : 4;
  const cardWidth = Math.floor(
    (availableWidth - cardGap * (columnsPerRow - 1)) / columnsPerRow
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-[#020609]/92 pointer-events-auto overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col",
      style: { padding, gap: vw < 768 ? 14 : 18 },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            HudPanel,
            {
              title: "City Kit Lab",
              eyebrow: "Module Inspection Surface",
              variant: "signal",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] leading-5 text-white/55", children: "Full city module inventory with rendered previews, family filters, and composite candidates. Curate placement rules, adjacency bias, and higher-order assemblies." })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            HudButton,
            {
              label: "Close Lab",
              meta: "return to simulation",
              onPress: onClose
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(HudPanel, { title: "Filters", eyebrow: "Catalog Lens", variant: "signal", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-row flex-wrap gap-2", children: familyFilters.map((value) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              active: family === value,
              label: value,
              onPress: () => setFamily(value)
            },
            value
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-row flex-wrap gap-2", children: [
            placementFilters.map((value) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              FilterChip,
              {
                active: placementType === value,
                label: value,
                onPress: () => setPlacementType(value)
              },
              value
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FilterChip,
              {
                active: compositableOnly,
                label: "compositable",
                onPress: () => setCompositableOnly((current) => !current)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-row flex-wrap gap-2", children: subcategories.map((value) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FilterChip,
            {
              active: subcategory === value,
              label: value === "all" ? "all-subdirs" : formatCitySubcategoryLabel(value),
              onPress: () => setSubcategory(value)
            },
            value
          )) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudPanel,
          {
            title: `Models · ${models.length}`,
            eyebrow: "Rendered Previews",
            variant: "signal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-row flex-wrap", style: { gap: cardGap }, children: models.map((model) => /* @__PURE__ */ jsxRuntimeExports.jsx(ModelCard, { model, cardWidth }, model.id)) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudPanel,
          {
            title: "Composites",
            eyebrow: "Assemblage Clusters",
            variant: "signal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-4", children: composites.map((composite) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]", children: composite.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[11px] leading-5 text-white/55", children: composite.gameplayRole }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40", children: composite.parts.map((part) => part.modelId).join(" · ") })
                ]
              },
              composite.id
            )) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudPanel,
          {
            title: "Directory Semantics",
            eyebrow: "Subdirectory Understanding",
            variant: "signal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", children: directorySummaries.map((summary) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]", children: summary.directory }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-2 block font-mono text-[11px] leading-5 text-white/55", children: [
                    "Families: ",
                    summary.families.join(", ")
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40", children: `${summary.modelCount} models · passability ${summary.passabilityClasses.join(", ")}` })
                ]
              },
              summary.directory
            )) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudPanel,
          {
            title: "Floor Presets",
            eyebrow: "Procedural Surface Strategy",
            variant: "signal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", children: floorPresets.map((preset) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]", children: preset.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[11px] leading-5 text-white/55", children: preset.useCases.join(" · ") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40", children: `${preset.baseFamily} · ${preset.zoneAffinity.join(", ")}` })
                ]
              },
              preset.id
            )) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HudPanel,
          {
            title: "Scenario Fixtures",
            eyebrow: "Deterministic Layout Seeds",
            variant: "signal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", children: scenarios.map((scenario) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]", children: scenario.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[11px] leading-5 text-white/55", children: scenario.description }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40", children: `${scenario.placementCount} placements · ${scenario.grid}` })
                ]
              },
              scenario.id
            )) })
          }
        )
      ]
    }
  ) });
}

export { CityKitLab };
//# sourceMappingURL=CityKitLab-CcYbMnUY.js.map
