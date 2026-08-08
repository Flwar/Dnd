export type AtlasLayerId = "surface" | "depths";

export type AtlasLocationId =
  | "village-gate"
  | "arfelon-square"
  | "wet-raven-inn"
  | "smithy"
  | "healer-hut"
  | "headman-house"
  | "mine-road"
  | "old-watchtower"
  | "standing-stones"
  | "mine-entrance"
  | "main-tunnel"
  | "abandoned-tool-store"
  | "flooded-passage"
  | "pillar-hall"
  | "hidden-chamber"
  | "guardian-sanctum"
  | "bell-tower-roof"
  | "moonwell-undercrypt";

export interface AtlasPoint {
  /** Horizontal position in normalized atlas coordinates (0–100). */
  x: number;
  /** Vertical position in normalized atlas coordinates (0–100). */
  y: number;
}

export interface AtlasViewport {
  /** Scale applied to the shared atlas artwork for this layer. */
  scale: number;
  /** Normalized horizontal focal point for the artwork. */
  focusX: number;
  /** Normalized vertical focal point for the artwork. */
  focusY: number;
}

export interface AtlasLayerDefinition {
  id: AtlasLayerId;
  name: string;
  shortName: string;
  description: string;
  backgroundAssetKey: string;
  viewport: AtlasViewport;
  treatment: "mist" | "subterranean";
}

export type AtlasMarkerKind =
  | "gate"
  | "settlement"
  | "inn"
  | "smithy"
  | "healer"
  | "house"
  | "road"
  | "tower"
  | "standing-stones"
  | "mine"
  | "tunnel"
  | "store"
  | "flood"
  | "pillars"
  | "secret"
  | "guardian"
  | "undercrypt";

export type AtlasLabelPlacement = "above" | "below" | "start" | "end";

export interface AtlasNodeDefinition {
  locationId: AtlasLocationId;
  layer: AtlasLayerId;
  point: AtlasPoint;
  marker: AtlasMarkerKind;
  labelPlacement: AtlasLabelPlacement;
  importance: "minor" | "major" | "landmark";
  secret?: boolean;
}

export interface AtlasFlagRequirement {
  flag: string;
  equals?: boolean | string | number;
}

export type AtlasRouteKind = "village" | "road" | "trail" | "tunnel" | "secret";

export interface AtlasRouteDefinition {
  id: string;
  layer: AtlasLayerId;
  from: AtlasLocationId;
  to: AtlasLocationId;
  kind: AtlasRouteKind;
  /** Optional normalized points used to bend an illustrated route. */
  waypoints?: readonly AtlasPoint[];
  requiresAll?: readonly AtlasFlagRequirement[];
  secret?: boolean;
}

export interface AtlasPassageDefinition {
  id: string;
  from: AtlasLocationId;
  to: AtlasLocationId;
  labelFrom: string;
  labelTo: string;
  requiresAll?: readonly AtlasFlagRequirement[];
}

export type AtlasAnnotationTone = "benefit" | "danger" | "knowledge" | "world";

export interface AtlasAnnotationAnchor {
  flag: string;
  layer: AtlasLayerId;
  locationId: AtlasLocationId;
  point: AtlasPoint;
}

export interface AtlasStateInput {
  currentLocationId: string;
  discoveredLocationIds: readonly string[];
  visitedLocationIds: readonly string[];
  flags: Readonly<Record<string, boolean | string | number>>;
}

export type AtlasNodeVisibility = "discovered" | "visited" | "current";

export interface AtlasResolvedNode extends AtlasNodeDefinition {
  visibility: AtlasNodeVisibility;
}

export interface AtlasResolvedAnnotation extends AtlasAnnotationAnchor {
  key: string;
  title: string;
  detail: string;
  tone: AtlasAnnotationTone;
  priority: number;
}

export interface AtlasDiscoveryProgress {
  discovered: number;
  visited: number;
  total: number;
}
