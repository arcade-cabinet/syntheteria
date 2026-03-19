const PRESENTATION = {
  home_base: {
    badge: "Home Base",
    enterLabel: "Enter Command Hub",
    foundationLabel: "Substation Already Online",
    role: "Primary relay and initial substation nucleus.",
    summary: "The home base is the first stable urban shell under your control. It anchors persistence, recovery, and future fabrication growth.",
    surveyLabel: "Review Relay Shell"
  },
  coast_mines: {
    badge: "Coast Mines",
    enterLabel: "Inspect Mining Block",
    foundationLabel: "Establish Mining Substation",
    role: "Coastal extraction and salvage foothold.",
    summary: "These structures support shoreline extraction, cargo staging, and rugged industrial growth. They fit storage-heavy and utility-biased composites.",
    surveyLabel: "Survey Extraction Site"
  },
  resource_depot: {
    badge: "Resource Depot",
    enterLabel: "Inspect Depot",
    foundationLabel: "Establish Depot Substation",
    role: "Storage and distribution.",
    summary: "Resource staging and distribution node.",
    surveyLabel: "Survey Depot Site"
  },
  research_site: {
    badge: "Research Site",
    enterLabel: "Inspect Research",
    foundationLabel: "Establish Research Substation",
    role: "Research and instrumentation.",
    summary: "Research and compute enclave.",
    surveyLabel: "Survey Research Site"
  },
  faction_outpost: {
    badge: "Faction Outpost",
    enterLabel: "Inspect Outpost",
    foundationLabel: "Establish Outpost",
    role: "Faction presence.",
    summary: "Faction-controlled outpost.",
    surveyLabel: "Survey Outpost"
  },
  ruin: {
    badge: "Ruin",
    enterLabel: "Inspect Ruin",
    foundationLabel: "Salvage",
    role: "Abandoned structure.",
    summary: "Unclaimed ruin.",
    surveyLabel: "Survey Ruin"
  },
  science_campus: {
    badge: "Science Campus",
    enterLabel: "Inspect Research Wing",
    foundationLabel: "Establish Research Substation",
    role: "Compute-rich research and instrumentation enclave.",
    summary: "The science campus is suited to compute, signal, and fabrication-adjacent rooms. Its layouts should trend toward clean corridors and tower-like control spaces.",
    surveyLabel: "Survey Campus Ruins"
  },
  northern_cult_site: {
    badge: "Cult Territory",
    enterLabel: "Restricted",
    foundationLabel: "Cannot Found",
    role: "Hostile ritual infrastructure in the northern storm belt.",
    summary: "This site marks cult-controlled territory. It should read as dangerous and inaccessible until combat and faction systems mature.",
    surveyLabel: "Observe Hostile Site"
  },
  deep_sea_gateway: {
    badge: "Gateway Route",
    enterLabel: "Locked",
    foundationLabel: "Unavailable",
    role: "Late-game route infrastructure tied to launch and oceanic progression.",
    summary: "The gateway remains mechanically reserved for later campaign phases, but its spatial contract is already persisted and visible in the world.",
    surveyLabel: "Scan Gateway Anchor"
  }
};
function getCityPurposePresentation(poiType) {
  return PRESENTATION[poiType];
}
function describeCityState(state) {
  switch (state) {
    case "latent":
      return "Unsurveyed Shell";
    case "surveyed":
      return "Surveyed Base";
    case "founded":
      return "Substation Online";
    default:
      return "Unknown State";
  }
}

export { describeCityState as d, getCityPurposePresentation as g };
//# sourceMappingURL=cityPresentation-D5dFAzX3.js.map
