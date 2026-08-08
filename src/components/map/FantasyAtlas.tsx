"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDownToLine,
  Castle,
  CircleHelp,
  Compass,
  Crown,
  Eye,
  Footprints,
  Hammer,
  Home,
  Landmark,
  LocateFixed,
  MapPin,
  Mountain,
  Pickaxe,
  Route as RouteIcon,
  Shield,
  Sparkles,
  TentTree,
  Waves,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import {
  atlasLayerById,
  atlasLayers,
  atlasNodeByLocationId,
  atlasNodes,
  getAtlasDiscoveryProgress,
  getVisibleAtlasAnnotations,
  getVisibleAtlasNodes,
  getVisibleAtlasPassages,
  getVisibleAtlasRoutes,
} from "@/content/atlas";
import { locationsById } from "@/content/locations";
import { cn } from "@/lib/cn";
import { getAssetPath } from "@/lib/assets/manifest";
import type {
  AtlasDiscoveryProgress,
  AtlasLayerDefinition,
  AtlasLayerId,
  AtlasLocationId,
  AtlasMarkerKind,
  AtlasNodeDefinition,
  AtlasPassageDefinition,
  AtlasResolvedAnnotation,
  AtlasResolvedNode,
  AtlasRouteDefinition,
  AtlasStateInput,
} from "@/types/atlas";
import type { SaveData } from "@/types/game";

/**
 * The atlas UI consumes a small presentation contract instead of owning world
 * topology. Authored chapters can therefore provide another atlas without
 * changing the interaction, accessibility, or fog-of-war layer.
 */
export interface FantasyAtlasDefinitions {
  layers: readonly AtlasLayerDefinition[];
  nodes: readonly AtlasNodeDefinition[];
  nodeByLocationId: Readonly<Partial<Record<AtlasLocationId, AtlasNodeDefinition>>>;
  getVisibleNodes: (input: AtlasStateInput, layer: AtlasLayerId) => readonly AtlasResolvedNode[];
  getVisibleRoutes: (input: AtlasStateInput, layer: AtlasLayerId) => readonly AtlasRouteDefinition[];
  getVisiblePassages: (input: AtlasStateInput, layer: AtlasLayerId) => readonly AtlasPassageDefinition[];
  getVisibleAnnotations: (input: AtlasStateInput, layer: AtlasLayerId) => readonly AtlasResolvedAnnotation[];
  getDiscoveryProgress: (input: AtlasStateInput, layer: AtlasLayerId) => AtlasDiscoveryProgress;
}

export const mistvaleAtlasDefinitions: FantasyAtlasDefinitions = {
  layers: atlasLayers,
  nodes: atlasNodes,
  nodeByLocationId: atlasNodeByLocationId,
  getVisibleNodes: getVisibleAtlasNodes,
  getVisibleRoutes: getVisibleAtlasRoutes,
  getVisiblePassages: getVisibleAtlasPassages,
  getVisibleAnnotations: getVisibleAtlasAnnotations,
  getDiscoveryProgress: getAtlasDiscoveryProgress,
};

const markerIcons: Record<AtlasMarkerKind, LucideIcon> = {
  gate: Castle,
  settlement: Home,
  inn: TentTree,
  smithy: Hammer,
  healer: Sparkles,
  house: Home,
  road: Footprints,
  tower: Landmark,
  "standing-stones": Crown,
  mine: Pickaxe,
  tunnel: Mountain,
  store: Shield,
  flood: Waves,
  pillars: Landmark,
  secret: Eye,
  guardian: Shield,
  undercrypt: Crown,
};

const markerSizeClasses: Record<AtlasNodeDefinition["importance"], string> = {
  minor: "size-8 sm:size-9",
  major: "size-9 sm:size-10",
  landmark: "size-10 sm:size-11",
};

const labelPlacementClasses: Record<AtlasNodeDefinition["labelPlacement"], string> = {
  above: "bottom-[calc(100%+.35rem)] left-1/2 -translate-x-1/2",
  below: "top-[calc(100%+.35rem)] left-1/2 -translate-x-1/2",
  start: "end-[calc(100%+.45rem)] top-1/2 -translate-y-1/2",
  end: "start-[calc(100%+.45rem)] top-1/2 -translate-y-1/2",
};

const annotationToneClasses: Record<AtlasResolvedAnnotation["tone"], string> = {
  benefit: "border-[#7ebf8c]/55 bg-[#102a1a]/95 text-[#a9ddb3]",
  danger: "border-[#d65c59]/60 bg-[#32151a]/95 text-[#ffaaa4]",
  knowledge: "border-[#6fd4eb]/55 bg-[#0c2830]/95 text-[#b4e8f2]",
  world: "border-[#d0ae68]/55 bg-[#2a2113]/95 text-[#f0d69d]",
};

const routeColors: Record<AtlasRouteDefinition["kind"], string> = {
  village: "#d9bd7b",
  road: "#cf9e55",
  trail: "#aebaa9",
  tunnel: "#6bcadf",
  secret: "#bc8be5",
};

const zoomLevels = [1, 1.22, 1.48, 1.78] as const;

function asAtlasInput(save: SaveData): AtlasStateInput {
  return {
    currentLocationId: save.story.currentLocationId,
    discoveredLocationIds: save.discoveredLocationIds,
    visitedLocationIds: save.story.visitedLocationIds,
    flags: save.story.flags,
  };
}

function getInitialLayer(
  save: SaveData,
  definitions: FantasyAtlasDefinitions,
): AtlasLayerId {
  return definitions.nodes.find((node) => node.locationId === save.story.currentLocationId)?.layer
    ?? definitions.layers[0]?.id
    ?? "surface";
}

function routePoints(
  route: AtlasRouteDefinition,
  definitions: FantasyAtlasDefinitions,
): string | null {
  const from = definitions.nodeByLocationId[route.from]?.point;
  const to = definitions.nodeByLocationId[route.to]?.point;
  if (!from || !to) return null;
  return [from, ...(route.waypoints ?? []), to]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function nodeStatusLabel(node: AtlasResolvedNode): string {
  if (node.visibility === "current") return "המיקום הנוכחי";
  if (node.visibility === "visited") return "מקום שביקרת בו";
  return "מקום שהתגלה";
}

function nodeButtonTone(node: AtlasResolvedNode): string {
  if (node.visibility === "current") {
    return "border-[#f5d98f] bg-[#2b2111]/95 text-[#ffe5a3] shadow-[0_0_0_4px_rgba(235,199,115,.16),0_0_25px_rgba(235,199,115,.5)]";
  }
  if (node.visibility === "visited") {
    return "border-[#7ccfe2]/65 bg-[#0c2730]/95 text-[#bdeaf2] shadow-[0_0_18px_rgba(79,181,205,.3)]";
  }
  return "border-[#b8b2a6]/55 bg-[#181a1d]/95 text-[#ded8cb] shadow-[0_8px_18px_rgba(0,0,0,.55)]";
}

function AtlasRouteLines({
  routes,
  definitions,
}: {
  routes: readonly AtlasRouteDefinition[];
  definitions: FantasyAtlasDefinitions;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="atlas-routes"
    >
      <defs>
        <filter id="atlas-route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.65" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {routes.map((route) => {
        const points = routePoints(route, definitions);
        if (!points) return null;
        return (
          <g key={route.id} data-route-id={route.id}>
            <polyline
              points={points}
              fill="none"
              stroke="rgba(0,0,0,.72)"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={points}
              fill="none"
              stroke={routeColors[route.kind]}
              strokeWidth={route.kind === "secret" ? 1.8 : 1.55}
              strokeDasharray={route.kind === "trail" ? "4 4" : route.kind === "secret" ? "2 3" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter="url(#atlas-route-glow)"
            />
          </g>
        );
      })}
    </svg>
  );
}

function AtlasFog({
  hiddenNodes,
  layer,
}: {
  hiddenNodes: readonly AtlasNodeDefinition[];
  layer: AtlasLayerDefinition;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="atlas-fog">
      <div
        className={cn(
          "absolute inset-0",
          layer.treatment === "mist"
            ? "bg-[linear-gradient(to_bottom,rgba(6,10,13,.04)_20%,rgba(4,7,10,.24)_68%,rgba(2,4,6,.52))]"
            : "bg-[linear-gradient(to_top,rgba(3,9,13,.05)_20%,rgba(2,5,8,.3)_72%,rgba(1,3,5,.7))]",
        )}
      />
      {hiddenNodes.map((node, index) => (
        <span
          key={node.locationId}
          className="absolute aspect-[1.65] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(8,13,17,.94)_0%,rgba(10,16,20,.82)_38%,rgba(18,25,29,.46)_63%,transparent_78%)] blur-[9px] motion-safe:animate-pulse motion-reduce:animate-none"
          style={{
            left: `${node.point.x}%`,
            top: `${node.point.y}%`,
            animationDelay: `${(index % 5) * 240}ms`,
            animationDuration: `${4.5 + (index % 3)}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,.45)_100%)]" />
    </div>
  );
}

export function FantasyAtlas({
  save,
  atlas = mistvaleAtlasDefinitions,
  className,
}: {
  save: SaveData;
  atlas?: FantasyAtlasDefinitions;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const input = useMemo(() => asAtlasInput(save), [save]);
  const [activeLayerId, setActiveLayerId] = useState<AtlasLayerId>(() => getInitialLayer(save, atlas));
  const [selectedLocationId, setSelectedLocationId] = useState<string>(save.story.currentLocationId);
  const [zoomIndex, setZoomIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeLayer = atlas.layers.find((layer) => layer.id === activeLayerId)
    ?? atlas.layers[0]
    ?? atlasLayerById.surface;
  const visibleNodes = atlas.getVisibleNodes(input, activeLayer.id);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.locationId));
  const hiddenNodes = atlas.nodes.filter((node) => node.layer === activeLayer.id && !visibleNodeIds.has(node.locationId));
  const visibleRoutes = atlas.getVisibleRoutes(input, activeLayer.id);
  const visiblePassages = atlas.getVisiblePassages(input, activeLayer.id);
  const visibleAnnotations = atlas.getVisibleAnnotations(input, activeLayer.id);
  const progress = atlas.getDiscoveryProgress(input, activeLayer.id);
  const selectedNode = visibleNodes.find((node) => node.locationId === selectedLocationId)
    ?? visibleNodes.find((node) => node.visibility === "current")
    ?? visibleNodes[0];
  const selectedLocation = selectedNode ? locationsById[selectedNode.locationId] : undefined;
  const discoveredIds = new Set([
    ...save.discoveredLocationIds,
    ...save.story.visitedLocationIds,
    save.story.currentLocationId,
  ]);
  const knownExits = selectedLocation?.exits.filter((exit) => discoveredIds.has(exit.destinationId)) ?? [];
  const selectedAnnotations = selectedNode
    ? visibleAnnotations.filter((annotation) => annotation.locationId === selectedNode.locationId)
    : [];
  const zoom = zoomLevels[zoomIndex];
  const renderedScale = zoom * activeLayer.viewport.scale;
  const atlasDesktopSrc = getAssetPath(activeLayer.backgroundAssetKey);
  const atlasMobileSrc = getAssetPath(`${activeLayer.backgroundAssetKey}-mobile`);
  const layerAnchor = visibleNodes.find((node) => node.visibility === "current")?.point
    ?? selectedNode?.point
    ?? { x: activeLayer.viewport.focusX, y: activeLayer.viewport.focusY };

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const frame = window.requestAnimationFrame(() => {
      const canvas = scroller.firstElementChild;
      if (!(canvas instanceof HTMLElement)) return;
      const left = (layerAnchor.x / 100) * canvas.scrollWidth - (scroller.clientWidth / 2);
      const top = (layerAnchor.y / 100) * canvas.scrollHeight - (scroller.clientHeight / 2);
      scroller.scrollTo?.({ left, top, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeLayer.id, layerAnchor.x, layerAnchor.y, reduceMotion]);

  const chooseLayer = (layerId: AtlasLayerId) => {
    const nodes = atlas.getVisibleNodes(input, layerId);
    setActiveLayerId(layerId);
    setSelectedLocationId(
      nodes.find((node) => node.visibility === "current")?.locationId
      ?? nodes[0]?.locationId
      ?? "",
    );
    setZoomIndex(0);
  };

  const centerSelectedNode = () => {
    setZoomIndex(0);
    const node = selectedNode;
    const scroller = scrollRef.current;
    if (!node || !scroller) return;
    window.requestAnimationFrame(() => {
      const canvas = scroller.firstElementChild;
      if (!(canvas instanceof HTMLElement)) return;
      const left = (node.point.x / 100) * canvas.scrollWidth - (scroller.clientWidth / 2);
      const top = (node.point.y / 100) * canvas.scrollHeight - (scroller.clientHeight / 2);
      scroller.scrollTo?.({ left, top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  };

  const discoveredPercent = progress.total ? Math.round((progress.discovered / progress.total) * 100) : 0;

  return (
    <section className={cn("min-w-0 space-y-3 sm:space-y-4", className)} aria-labelledby="fantasy-atlas-title">
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-3 border-b border-[#c6a15b]/20 pb-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[.2em] text-[#7ed8ec]/75">
            <Compass className="size-3.5" aria-hidden="true" />
            אטלס ארצות ואלדר
          </p>
          <h3 id="fantasy-atlas-title" className="display-font mt-0.5 text-2xl text-[#f0cf82] sm:text-3xl">הדרכים שמתחת לערפל</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#aaa294] sm:text-sm sm:leading-6">כל מקום, נתיב והחלטה נחרטים במפה. האזורים הכהים עדיין ממתינים שתגלו אותם.</p>
        </div>
        <div className="min-w-40 border border-[#c6a15b]/25 bg-black/25 px-3 py-2" role="status" aria-label={`נחשפו ${progress.discovered} מתוך ${progress.total} מקומות בשכבה`}>
          <div className="flex items-center justify-between gap-3 text-[11px] text-[#d9c18b]">
            <span>חשיפת האזור</span>
            <bdi className="font-bold tabular-nums">{discoveredPercent}%</bdi>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/70">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#527d88,#79d0e3,#d5b76f)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${discoveredPercent}%` }} />
          </div>
        </div>
      </header>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full min-w-0 grid-cols-2 gap-1 border border-[#c6a15b]/20 bg-black/25 p-1 sm:w-auto sm:flex sm:flex-none" role="tablist" aria-label="שכבות האטלס">
          {atlas.layers.map((layer) => {
            const isActive = layer.id === activeLayer.id;
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                id={`atlas-tab-${layer.id}`}
                aria-controls="atlas-map-canvas"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "min-h-11 min-w-0 px-3 py-2 text-xs font-bold transition-[border-color,background-color,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf82] motion-reduce:transition-none sm:min-w-40 sm:text-sm",
                  isActive
                    ? "border border-[#d5b76f]/55 bg-[#7e5a24]/35 text-[#f6dfaa] shadow-[inset_0_0_18px_rgba(207,166,84,.12)]"
                    : "border border-transparent text-[#9f988c] hover:bg-white/[.04] hover:text-[#ded5c5]",
                )}
                onClick={() => chooseLayer(layer.id)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const currentIndex = atlas.layers.findIndex((entry) => entry.id === layer.id);
                  const lastIndex = atlas.layers.length - 1;
                  const nextIndex = event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? lastIndex
                      : event.key === "ArrowLeft"
                        ? (currentIndex + 1) % atlas.layers.length
                        : (currentIndex - 1 + atlas.layers.length) % atlas.layers.length;
                  const nextLayer = atlas.layers[nextIndex];
                  if (!nextLayer) return;
                  chooseLayer(nextLayer.id);
                  window.requestAnimationFrame(() => document.getElementById(`atlas-tab-${nextLayer.id}`)?.focus());
                }}
              >
                <span className="block whitespace-nowrap">{layer.name}</span>
                <span className="mt-0.5 hidden text-[9px] font-normal text-current opacity-65 sm:block">{layer.shortName}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center self-end border border-white/10 bg-black/35 p-1" role="group" aria-label="פקדי הגדלת המפה">
          <button
            type="button"
            className="grid size-11 place-items-center text-[#d4c9b4] transition-colors hover:bg-white/[.06] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f0cf82] disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            disabled={zoomIndex === 0}
            aria-label="הקטנת המפה"
          >
            <ZoomOut className="size-5" aria-hidden="true" />
          </button>
          <bdi className="min-w-12 text-center text-[11px] font-bold tabular-nums text-[#cdb67e]" aria-live="polite">{Math.round(zoom * 100)}%</bdi>
          <button
            type="button"
            className="grid size-11 place-items-center text-[#d4c9b4] transition-colors hover:bg-white/[.06] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f0cf82] disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => setZoomIndex((value) => Math.min(zoomLevels.length - 1, value + 1))}
            disabled={zoomIndex === zoomLevels.length - 1}
            aria-label="הגדלת המפה"
          >
            <ZoomIn className="size-5" aria-hidden="true" />
          </button>
          <span className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />
          <button
            type="button"
            className="grid size-11 place-items-center text-[#d4c9b4] transition-colors hover:bg-white/[.06] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f0cf82]"
            onClick={centerSelectedNode}
            aria-label="מרכוז המיקום המסומן"
          >
            <LocateFixed className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p id="atlas-layer-description" className="text-xs leading-5 text-[#a8a094]">{activeLayer.description}</p>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
        <div className="min-w-0 overflow-hidden border border-[#c6a15b]/30 bg-[#030609] shadow-[0_18px_48px_rgba(0,0,0,.5),inset_0_1px_rgba(255,255,255,.05)]">
          <div
            ref={scrollRef}
            id="atlas-map-canvas"
            role="tabpanel"
            aria-labelledby={`atlas-tab-${activeLayer.id}`}
            aria-describedby="atlas-layer-description atlas-pan-hint"
            tabIndex={0}
            dir="ltr"
            className="relative max-h-[56dvh] min-h-[20rem] max-w-full touch-pan-x touch-pan-y overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#f0cf82] sm:max-h-[62dvh] sm:min-h-[28rem]"
          >
            <div
              className="relative aspect-[3/2] min-h-[20rem] origin-top-left overflow-hidden sm:min-h-[28rem]"
              style={{
                width: `${renderedScale * 100}%`,
                minWidth: `${Math.round(640 * renderedScale)}px`,
              }}
            >
              <ArtDirectedPicture
                desktopSrc={atlasDesktopSrc}
                mobileSrc={atlasMobileSrc}
                alt=""
                pictureClassName="absolute inset-0"
                className="size-full object-cover"
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-0",
                  activeLayer.treatment === "mist"
                    ? "bg-[linear-gradient(to_bottom,transparent_5%,transparent_57%,rgba(1,4,6,.7)_100%)]"
                    : "bg-[linear-gradient(to_bottom,rgba(1,4,6,.62)_0%,rgba(1,4,6,.18)_39%,transparent_56%)]",
                )}
                aria-hidden="true"
              />
              <AtlasRouteLines routes={visibleRoutes} definitions={atlas} />
              <AtlasFog hiddenNodes={hiddenNodes} layer={activeLayer} />

              {visiblePassages.map((passage) => {
                const fromNode = atlas.nodeByLocationId[passage.from];
                const toNode = atlas.nodeByLocationId[passage.to];
                const anchor = fromNode?.layer === activeLayer.id ? fromNode : toNode;
                if (!anchor) return null;
                const label = fromNode?.layer === activeLayer.id ? passage.labelFrom : passage.labelTo;
                return (
                  <div
                    key={passage.id}
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${anchor.point.x}%`, top: `${anchor.point.y + 7}%` }}
                    role="note"
                    aria-label={label}
                    dir="rtl"
                  >
                    <span className="grid size-7 place-items-center rounded-full border border-[#7ed8ec]/55 bg-[#071b22]/92 text-[#aee5f0] shadow-[0_0_15px_rgba(98,198,223,.3)]">
                      <ArrowDownToLine className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                    </span>
                  </div>
                );
              })}

              {visibleNodes.map((node) => {
                const location = locationsById[node.locationId];
                if (!location) return null;
                const Icon = markerIcons[node.marker];
                const isSelected = selectedNode?.locationId === node.locationId;
                const showPersistentLabel = isSelected
                  || node.visibility === "current"
                  || node.importance === "landmark";
                return (
                  <button
                    key={node.locationId}
                    type="button"
                    className="group absolute z-30 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center focus-visible:outline-none sm:size-12"
                    style={{ left: `${node.point.x}%`, top: `${node.point.y}%` }}
                    onClick={() => setSelectedLocationId(node.locationId)}
                    aria-label={`${location.name}, ${nodeStatusLabel(node)}`}
                    aria-pressed={isSelected}
                    dir="rtl"
                  >
                    <span
                      className={cn(
                        "relative grid place-items-center rounded-full border-2 backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-200 group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-[#f0cf82] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-black motion-reduce:transition-none",
                        markerSizeClasses[node.importance],
                        nodeButtonTone(node),
                        isSelected ? "scale-110 ring-2 ring-white/65 ring-offset-2 ring-offset-black" : "",
                      )}
                    >
                      {node.visibility === "current" ? (
                        <span className="absolute -inset-2 rounded-full border border-[#f5d98f]/55 motion-safe:animate-ping motion-reduce:animate-none" aria-hidden="true" />
                      ) : null}
                      <Icon className="size-[48%] drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "pointer-events-none absolute max-w-40 whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-bold leading-4 shadow-[0_4px_12px_rgba(0,0,0,.6)] backdrop-blur-sm transition-colors group-hover:border-[#e4c579]/55 sm:text-xs",
                        labelPlacementClasses[node.labelPlacement],
                        showPersistentLabel
                          ? "opacity-100"
                          : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
                        node.visibility === "current"
                          ? "border-[#d8b86d]/55 bg-[#241b0d]/92 text-[#ffe3a2]"
                          : "border-white/15 bg-black/78 text-[#e8dfd0]",
                      )}
                    >
                      {location.name}
                    </span>
                  </button>
                );
              })}

              {visibleAnnotations.slice(0, 6).map((annotation) => (
                <div
                  key={annotation.flag}
                  className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${annotation.point.x}%`, top: `${annotation.point.y}%` }}
                  role="note"
                  aria-label={`${annotation.title}: ${annotation.detail}`}
                  dir="rtl"
                >
                  <span className={cn("grid size-7 rotate-45 place-items-center border shadow-[0_8px_18px_rgba(0,0,0,.55)] backdrop-blur-md", annotationToneClasses[annotation.tone])}>
                    <Sparkles className="size-3.5 -rotate-45" aria-hidden="true" />
                    <span className="sr-only">{annotation.title}</span>
                  </span>
                </div>
              ))}

              {!visibleNodes.length ? (
                <div className="absolute inset-0 z-50 grid place-items-center bg-black/35 p-6 text-center" dir="rtl">
                  <div className="max-w-sm border border-[#c6a15b]/30 bg-[#090d11]/90 p-5 backdrop-blur-md">
                    <CircleHelp className="mx-auto size-8 text-[#7ed8ec]/65" aria-hidden="true" />
                    <p className="display-font mt-2 text-xl text-[#e5d09c]">השכבה עדיין אבודה בערפל</p>
                    <p className="mt-1 text-sm leading-6 text-[#aaa294]">כשתימצא דרך פנימה, קווי המפה ייחשפו כאן.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/65 px-3 py-2 text-[10px] text-[#9d9689]" dir="rtl">
            <p id="atlas-pan-hint" className="flex items-center gap-1.5"><RouteIcon className="size-3.5 text-[#7ed8ec]/75" aria-hidden="true" />גררו את המפה כדי לחקור; השתמשו בכפתורים כדי להגדיל.</p>
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="מקרא המפה">
              <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="size-2 rounded-full border border-[#f5d98f] bg-[#8a642b]" />כאן אתם</span>
              <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="size-2 rounded-full border border-[#7ccfe2] bg-[#17434d]" />ביקרתם</span>
              <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="size-2 rounded-full border border-[#b8b2a6] bg-[#333]" />התגלה</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="size-3 text-[#9bd6a8]" aria-hidden="true" />השפעה</span>
            </div>
          </div>
        </div>

        <aside className="min-w-0 border border-[#c6a15b]/25 bg-[linear-gradient(155deg,rgba(25,28,31,.98),rgba(7,10,13,.98))] shadow-[inset_0_1px_rgba(255,255,255,.045),0_14px_32px_rgba(0,0,0,.34)] xl:sticky xl:top-0" aria-live="polite">
          {selectedLocation && selectedNode ? (
            <>
              <div className="relative aspect-[16/7] min-h-28 overflow-hidden border-b border-[#c6a15b]/20">
                <Image
                  src={getAssetPath(selectedLocation.backgroundAssetKey)}
                  alt={`מבט אל ${selectedLocation.name}`}
                  fill
                  sizes="(max-width: 1279px) 100vw, 304px"
                  className="object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,10,13,.98),rgba(7,10,13,.1)_75%)]" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className="inline-flex items-center gap-1 border border-white/15 bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-[#cfc6b5]">
                    <MapPin className="size-3 text-[#d5b76f]" aria-hidden="true" />
                    {nodeStatusLabel(selectedNode)}
                  </span>
                  <h4 className="display-font mt-1 text-2xl leading-tight text-[#f2dfb0]">{selectedLocation.name}</h4>
                </div>
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <p className="text-sm leading-6 text-[#c8c0b3]">{selectedLocation.description}</p>
                <dl className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="border border-white/10 bg-black/20 px-2.5 py-2">
                    <dt className="text-[10px] font-bold text-[#aaa294]">מצב</dt>
                    <dd className="mt-0.5 text-[#ded5c5]">{nodeStatusLabel(selectedNode)}</dd>
                  </div>
                  <div className="border border-white/10 bg-black/20 px-2.5 py-2">
                    <dt className="text-[10px] font-bold text-[#aaa294]">נתיבים ידועים</dt>
                    <dd className="mt-0.5 text-[#ded5c5]"><bdi>{knownExits.length}</bdi></dd>
                  </div>
                </dl>
                {knownExits.length ? (
                  <div>
                    <h5 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[.12em] text-[#c9ad69]"><Footprints className="size-3.5" aria-hidden="true" />דרכים שזכורות לכם</h5>
                    <ul className="mt-1.5 space-y-1 text-xs text-[#b9b0a2]">
                      {knownExits.slice(0, 4).map((exit) => (
                        <li key={exit.destinationId} className="flex items-start gap-1.5 border-s border-[#7ed8ec]/25 ps-2">
                          <span>{exit.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedAnnotations.map((annotation) => (
                  <article key={annotation.flag} className={cn("border border-s-2 p-2.5", annotationToneClasses[annotation.tone])}>
                    <h5 className="text-xs font-bold">{annotation.title}</h5>
                    <p className="mt-1 text-xs leading-5 text-[#d4ccbd]">{annotation.detail}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="grid min-h-48 place-items-center p-5 text-center">
              <div>
                <MapPin className="mx-auto size-7 text-[#6c6860]" aria-hidden="true" />
                <p className="mt-2 text-sm text-[#a9a196]">בחרו מקום שנחשף כדי לקרוא את הרשומה שלו.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {visibleAnnotations.length ? (
        <section aria-labelledby="atlas-world-marks-title">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 id="atlas-world-marks-title" className="display-font flex items-center gap-2 text-lg text-[#e3cc96]">
              <Sparkles className="size-4 text-[#7ed8ec]" aria-hidden="true" />
              סימנים שהשארתם בעולם
            </h4>
            <span className="text-[10px] text-[#888177]"><bdi>{visibleAnnotations.length}</bdi> שינויים נראים</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibleAnnotations.slice(0, 6).map((annotation) => (
              <article key={annotation.flag} className={cn("border border-s-2 p-3", annotationToneClasses[annotation.tone])}>
                <h5 className="text-xs font-bold">{annotation.title}</h5>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#d4ccbd]">{annotation.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
