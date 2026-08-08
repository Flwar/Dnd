import { getFlagConsequence } from "./consequences";
import type {
  AtlasAnnotationAnchor,
  AtlasDiscoveryProgress,
  AtlasLayerDefinition,
  AtlasLayerId,
  AtlasLocationId,
  AtlasNodeDefinition,
  AtlasPassageDefinition,
  AtlasResolvedAnnotation,
  AtlasResolvedNode,
  AtlasRouteDefinition,
  AtlasStateInput,
} from "@/types/atlas";

export const atlasLocationIds = [
  "village-gate",
  "arfelon-square",
  "wet-raven-inn",
  "smithy",
  "healer-hut",
  "headman-house",
  "mine-road",
  "old-watchtower",
  "standing-stones",
  "mine-entrance",
  "main-tunnel",
  "abandoned-tool-store",
  "flooded-passage",
  "pillar-hall",
  "hidden-chamber",
  "guardian-sanctum",
  "bell-tower-roof",
  "moonwell-undercrypt",
] as const satisfies readonly AtlasLocationId[];

export const atlasLayers = [
  {
    id: "surface",
    name: "פני השטח",
    shortName: "ערפלון והגבעות",
    description: "הכפר, הדרכים העתיקות והאתרים שהערפל מנסה להסתיר.",
    backgroundAssetKey: "background-mistvale-atlas",
    viewport: { scale: 1, focusX: 50, focusY: 50 },
    treatment: "mist",
  },
  {
    id: "depths",
    name: "מעמקי המכרה",
    shortName: "מתחת לערפלון",
    description: "מנהרות שנשכחו, מים שחורים והיכלות קדומים מתחת לאבן.",
    backgroundAssetKey: "background-mistvale-atlas",
    viewport: { scale: 1.35, focusX: 52, focusY: 76 },
    treatment: "subterranean",
  },
] as const satisfies readonly AtlasLayerDefinition[];

export const atlasNodes = [
  { locationId: "old-watchtower", layer: "surface", point: { x: 31, y: 10 }, marker: "tower", labelPlacement: "below", importance: "landmark" },
  { locationId: "standing-stones", layer: "surface", point: { x: 11, y: 28 }, marker: "standing-stones", labelPlacement: "below", importance: "landmark", secret: true },
  { locationId: "bell-tower-roof", layer: "surface", point: { x: 72, y: 19 }, marker: "tower", labelPlacement: "above", importance: "landmark", secret: true },
  { locationId: "wet-raven-inn", layer: "surface", point: { x: 58, y: 36 }, marker: "inn", labelPlacement: "start", importance: "minor" },
  { locationId: "arfelon-square", layer: "surface", point: { x: 70, y: 38 }, marker: "settlement", labelPlacement: "below", importance: "landmark" },
  { locationId: "smithy", layer: "surface", point: { x: 86, y: 43 }, marker: "smithy", labelPlacement: "start", importance: "minor" },
  { locationId: "headman-house", layer: "surface", point: { x: 64, y: 27 }, marker: "house", labelPlacement: "start", importance: "minor" },
  { locationId: "healer-hut", layer: "surface", point: { x: 79, y: 48 }, marker: "healer", labelPlacement: "below", importance: "minor" },
  { locationId: "village-gate", layer: "surface", point: { x: 49, y: 48 }, marker: "gate", labelPlacement: "above", importance: "major" },
  { locationId: "mine-road", layer: "surface", point: { x: 34, y: 49 }, marker: "road", labelPlacement: "above", importance: "major" },
  { locationId: "mine-entrance", layer: "surface", point: { x: 7, y: 56 }, marker: "mine", labelPlacement: "above", importance: "landmark" },
  { locationId: "main-tunnel", layer: "depths", point: { x: 8, y: 79 }, marker: "tunnel", labelPlacement: "above", importance: "major" },
  { locationId: "abandoned-tool-store", layer: "depths", point: { x: 30, y: 77 }, marker: "store", labelPlacement: "above", importance: "minor" },
  { locationId: "flooded-passage", layer: "depths", point: { x: 46, y: 70 }, marker: "flood", labelPlacement: "above", importance: "major" },
  { locationId: "pillar-hall", layer: "depths", point: { x: 61, y: 63 }, marker: "pillars", labelPlacement: "above", importance: "major" },
  { locationId: "hidden-chamber", layer: "depths", point: { x: 58, y: 90 }, marker: "secret", labelPlacement: "above", importance: "major", secret: true },
  { locationId: "guardian-sanctum", layer: "depths", point: { x: 87, y: 67 }, marker: "guardian", labelPlacement: "above", importance: "landmark" },
  { locationId: "moonwell-undercrypt", layer: "depths", point: { x: 84, y: 90 }, marker: "undercrypt", labelPlacement: "above", importance: "landmark", secret: true },
] as const satisfies readonly AtlasNodeDefinition[];

export const atlasRoutes = [
  { id: "gate-square", layer: "surface", from: "village-gate", to: "arfelon-square", kind: "village", waypoints: [{ x: 60, y: 44 }] },
  { id: "square-inn", layer: "surface", from: "arfelon-square", to: "wet-raven-inn", kind: "village" },
  { id: "square-smithy", layer: "surface", from: "arfelon-square", to: "smithy", kind: "village" },
  { id: "square-healer", layer: "surface", from: "arfelon-square", to: "healer-hut", kind: "village" },
  { id: "square-headman", layer: "surface", from: "arfelon-square", to: "headman-house", kind: "village" },
  {
    id: "square-mine-road",
    layer: "surface",
    from: "arfelon-square",
    to: "mine-road",
    kind: "road",
    waypoints: [{ x: 52, y: 45 }],
    requiresAll: [{ flag: "quest_accepted" }],
  },
  {
    id: "square-bell-tower",
    layer: "surface",
    from: "arfelon-square",
    to: "bell-tower-roof",
    kind: "trail",
    requiresAll: [{ flag: "first_night_defense_chosen" }],
    secret: true,
  },
  {
    id: "road-mine-entrance",
    layer: "surface",
    from: "mine-road",
    to: "mine-entrance",
    kind: "road",
    waypoints: [{ x: 20, y: 53 }],
    requiresAll: [{ flag: "interaction_track-hooded-figures_completed" }],
  },
  { id: "road-watchtower", layer: "surface", from: "mine-road", to: "old-watchtower", kind: "trail", waypoints: [{ x: 34, y: 28 }] },
  {
    id: "road-standing-stones",
    layer: "surface",
    from: "mine-road",
    to: "standing-stones",
    kind: "secret",
    requiresAll: [{ flag: "old_map_secret_route" }],
    secret: true,
  },
  {
    id: "tunnel-tool-store",
    layer: "depths",
    from: "main-tunnel",
    to: "abandoned-tool-store",
    kind: "tunnel",
    waypoints: [{ x: 19, y: 82 }],
    requiresAll: [{ flag: "heard_danor" }],
  },
  { id: "tunnel-flood", layer: "depths", from: "main-tunnel", to: "flooded-passage", kind: "tunnel", waypoints: [{ x: 26, y: 74 }] },
  {
    id: "flood-pillar-hall",
    layer: "depths",
    from: "flooded-passage",
    to: "pillar-hall",
    kind: "tunnel",
    requiresAll: [{ flag: "flood_pack_defeated" }, { flag: "danor_resolved" }],
  },
  {
    id: "pillar-hidden-chamber",
    layer: "depths",
    from: "pillar-hall",
    to: "hidden-chamber",
    kind: "secret",
    requiresAll: [{ flag: "hidden_chamber_open" }],
    secret: true,
  },
  {
    id: "pillar-guardian",
    layer: "depths",
    from: "pillar-hall",
    to: "guardian-sanctum",
    kind: "tunnel",
    requiresAll: [{ flag: "cult_opened_guardian_hall" }],
  },
] as const satisfies readonly AtlasRouteDefinition[];

export const atlasPassages = [
  {
    id: "mine-descent",
    from: "mine-entrance",
    to: "main-tunnel",
    labelFrom: "ירידה אל המנהרה הראשית",
    labelTo: "עלייה אל כניסת המכרה",
    requiresAll: [{ flag: "tutorial_enemy_defeated" }],
  },
  {
    id: "danor-return-route",
    from: "guardian-sanctum",
    to: "arfelon-square",
    labelFrom: "נתיב החילוץ לערפלון",
    labelTo: "הנתיב החסום אל היכל השומר",
    requiresAll: [{ flag: "vision_seen" }],
  },
  {
    id: "bell-rope-descent",
    from: "bell-tower-roof",
    to: "moonwell-undercrypt",
    labelFrom: "ירידה בעקבות חבל הפעמון",
    labelTo: "עלייה אל גג מגדל הפעמון",
    requiresAll: [{ flag: "bell_signal_traced" }],
  },
] as const satisfies readonly AtlasPassageDefinition[];

export const atlasAnnotationAnchors = [
  { flag: "old_map_secret_route", layer: "surface", locationId: "standing-stones", point: { x: 15, y: 20 } },
  { flag: "tower_beacon_disabled", layer: "surface", locationId: "old-watchtower", point: { x: 35, y: 6 } },
  { flag: "tower_beacon_burning", layer: "surface", locationId: "old-watchtower", point: { x: 35, y: 6 } },
  { flag: "waystone_ward_restored", layer: "surface", locationId: "standing-stones", point: { x: 7, y: 20 } },
  { flag: "road_ambush_avoided", layer: "surface", locationId: "mine-road", point: { x: 29, y: 44 } },
  { flag: "danor_rescued", layer: "depths", locationId: "abandoned-tool-store", point: { x: 31, y: 69 } },
  { flag: "danor_left_behind", layer: "depths", locationId: "abandoned-tool-store", point: { x: 31, y: 69 } },
  { flag: "hidden_chamber_open", layer: "depths", locationId: "hidden-chamber", point: { x: 58, y: 83 } },
  { flag: "guardian_rune_understood", layer: "depths", locationId: "guardian-sanctum", point: { x: 82, y: 61 } },
  { flag: "guardian_awakened_early", layer: "depths", locationId: "guardian-sanctum", point: { x: 91, y: 61 } },
  { flag: "vision_seen", layer: "depths", locationId: "guardian-sanctum", point: { x: 91, y: 75 } },
  { flag: "bell_signal_traced", layer: "depths", locationId: "moonwell-undercrypt", point: { x: 84, y: 82 } },
  { flag: "arfelon_hidden_by_ward", layer: "surface", locationId: "arfelon-square", point: { x: 74, y: 31 } },
  { flag: "nightmare_followed_village", layer: "surface", locationId: "arfelon-square", point: { x: 65, y: 31 } },
  { flag: "path_north_chosen", layer: "surface", locationId: "arfelon-square", point: { x: 55, y: 7 } },
] as const satisfies readonly AtlasAnnotationAnchor[];

const atlasLocationIdSet = new Set<string>(atlasLocationIds);

export const atlasLayerById = Object.fromEntries(
  atlasLayers.map((layer) => [layer.id, layer]),
) as Record<AtlasLayerId, AtlasLayerDefinition>;

export const atlasNodeByLocationId = Object.fromEntries(
  atlasNodes.map((node) => [node.locationId, node]),
) as Record<AtlasLocationId, AtlasNodeDefinition>;

export function isAtlasLocationId(value: string): value is AtlasLocationId {
  return atlasLocationIdSet.has(value);
}

function hasRequirements(
  requirements: readonly { flag: string; equals?: boolean | string | number }[] | undefined,
  flags: AtlasStateInput["flags"],
): boolean {
  return !requirements || requirements.every((requirement) => (
    flags[requirement.flag] === (requirement.equals ?? true)
  ));
}

function getRevealedLocationIds(input: AtlasStateInput): ReadonlySet<AtlasLocationId> {
  const candidates = [
    ...input.discoveredLocationIds,
    ...input.visitedLocationIds,
    input.currentLocationId,
  ];
  return new Set(candidates.filter(isAtlasLocationId));
}

export function getAtlasNodesForLayer(layer: AtlasLayerId): readonly AtlasNodeDefinition[] {
  return atlasNodes.filter((node) => node.layer === layer);
}

export function getVisibleAtlasNodes(
  input: AtlasStateInput,
  layer: AtlasLayerId,
): AtlasResolvedNode[] {
  const revealed = getRevealedLocationIds(input);
  const visited = new Set(input.visitedLocationIds);

  return getAtlasNodesForLayer(layer)
    .filter((node) => revealed.has(node.locationId))
    .map((node) => ({
      ...node,
      visibility: node.locationId === input.currentLocationId
        ? "current"
        : visited.has(node.locationId)
          ? "visited"
          : "discovered",
    }));
}

export function getVisibleAtlasRoutes(
  input: AtlasStateInput,
  layer: AtlasLayerId,
): readonly AtlasRouteDefinition[] {
  const revealed = getRevealedLocationIds(input);
  return (atlasRoutes as readonly AtlasRouteDefinition[]).filter((route) => (
    route.layer === layer
    && revealed.has(route.from)
    && revealed.has(route.to)
    && hasRequirements(route.requiresAll, input.flags)
  ));
}

export function getVisibleAtlasPassages(
  input: AtlasStateInput,
  layer: AtlasLayerId,
): readonly AtlasPassageDefinition[] {
  const revealed = getRevealedLocationIds(input);
  return atlasPassages.filter((passage) => {
    const fromNode = atlasNodeByLocationId[passage.from];
    const toNode = atlasNodeByLocationId[passage.to];
    return (fromNode.layer === layer || toNode.layer === layer)
      && revealed.has(passage.from)
      && revealed.has(passage.to)
      && hasRequirements(passage.requiresAll, input.flags);
  });
}

export function getVisibleAtlasAnnotations(
  input: AtlasStateInput,
  layer: AtlasLayerId,
): AtlasResolvedAnnotation[] {
  const revealed = getRevealedLocationIds(input);
  const resolved: AtlasResolvedAnnotation[] = [];

  for (const anchor of atlasAnnotationAnchors as readonly AtlasAnnotationAnchor[]) {
    if (
      anchor.layer !== layer
      || !input.flags[anchor.flag]
      || !revealed.has(anchor.locationId)
    ) continue;

    const consequence = getFlagConsequence(anchor.flag);
    if (consequence) resolved.push({ ...anchor, ...consequence });
  }

  return resolved.sort((left, right) => right.priority - left.priority);
}

export function getAtlasDiscoveryProgress(
  input: AtlasStateInput,
  layer: AtlasLayerId,
): AtlasDiscoveryProgress {
  const visibleNodes = getVisibleAtlasNodes(input, layer);
  return {
    discovered: visibleNodes.length,
    visited: visibleNodes.filter((node) => node.visibility === "visited" || node.visibility === "current").length,
    total: getAtlasNodesForLayer(layer).length,
  };
}
