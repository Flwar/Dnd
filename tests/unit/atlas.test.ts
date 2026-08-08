import { describe, expect, it } from "vitest";
import {
  atlasAnnotationAnchors,
  atlasLocationIds,
  atlasNodeByLocationId,
  atlasNodes,
  atlasPassages,
  atlasRoutes,
  getAtlasDiscoveryProgress,
  getVisibleAtlasAnnotations,
  getVisibleAtlasNodes,
  getVisibleAtlasPassages,
  getVisibleAtlasRoutes,
  locations,
} from "../../src/content";
import { getFlagConsequence } from "../../src/content/consequences";
import type { AtlasStateInput } from "../../src/types/atlas";

const baseState: AtlasStateInput = {
  currentLocationId: "village-gate",
  discoveredLocationIds: ["village-gate"],
  visitedLocationIds: ["village-gate"],
  flags: {},
};

function edgeKey(from: string, to: string): string {
  return [from, to].sort().join("::");
}

describe("אטלס ערפלון", () => {
  it("ממקם כל מיקום משחק פעם אחת ובגבולות המפה", () => {
    expect(new Set(atlasLocationIds)).toEqual(new Set(locations.map((location) => location.id)));
    expect(atlasNodes).toHaveLength(locations.length);
    expect(new Set(atlasNodes.map((node) => node.locationId)).size).toBe(atlasNodes.length);

    for (const node of atlasNodes) {
      expect(node.point.x).toBeGreaterThanOrEqual(0);
      expect(node.point.x).toBeLessThanOrEqual(100);
      expect(node.point.y).toBeGreaterThanOrEqual(0);
      expect(node.point.y).toBeLessThanOrEqual(100);
    }
  });

  it("מייצג כל יציאה כדרך באותה שכבה או כמעבר בין שכבות", () => {
    const locationEdges = new Set(
      locations.flatMap((location) => (
        location.exits.map((exit) => edgeKey(location.id, exit.destinationId))
      )),
    );
    const atlasEdges = new Set([
      ...atlasRoutes.map((route) => edgeKey(route.from, route.to)),
      ...atlasPassages.map((passage) => edgeKey(passage.from, passage.to)),
    ]);

    expect(atlasEdges).toEqual(locationEdges);
    for (const route of atlasRoutes) {
      expect(atlasNodeByLocationId[route.from].layer).toBe(route.layer);
      expect(atlasNodeByLocationId[route.to].layer).toBe(route.layer);
    }
    for (const passage of atlasPassages) {
      expect(atlasNodeByLocationId[passage.from].layer).not.toBe(
        atlasNodeByLocationId[passage.to].layer,
      );
    }
  });

  it("אינו חושף צומת, דרך סודית או הערה לפני שהמיקום התגלה", () => {
    const state: AtlasStateInput = {
      ...baseState,
      currentLocationId: "mine-road",
      discoveredLocationIds: ["mine-road"],
      visitedLocationIds: ["mine-road"],
      flags: { old_map_secret_route: true },
    };

    expect(getVisibleAtlasNodes(state, "surface").map((node) => node.locationId)).toEqual(["mine-road"]);
    expect(getVisibleAtlasRoutes(state, "surface").map((route) => route.id)).not.toContain("road-standing-stones");
    expect(getVisibleAtlasAnnotations(state, "surface").map((entry) => entry.key)).not.toContain("old_map_secret_route");
  });

  it("חושף מסלול סודי והשלכה רק לאחר שמילאנו את התנאים", () => {
    const state: AtlasStateInput = {
      ...baseState,
      currentLocationId: "standing-stones",
      discoveredLocationIds: ["mine-road", "standing-stones"],
      visitedLocationIds: ["mine-road", "standing-stones"],
      flags: { old_map_secret_route: true },
    };

    expect(getVisibleAtlasRoutes(state, "surface").map((route) => route.id)).toContain("road-standing-stones");
    expect(getVisibleAtlasAnnotations(state, "surface")).toEqual([
      expect.objectContaining({
        key: "old_map_secret_route",
        locationId: "standing-stones",
        tone: "world",
      }),
    ]);
  });

  it("מבדיל בין גילוי, ביקור והמיקום הנוכחי", () => {
    const state: AtlasStateInput = {
      ...baseState,
      currentLocationId: "arfelon-square",
      discoveredLocationIds: ["village-gate", "arfelon-square", "smithy"],
      visitedLocationIds: ["village-gate", "arfelon-square"],
      flags: {},
    };
    const states = Object.fromEntries(
      getVisibleAtlasNodes(state, "surface").map((node) => [node.locationId, node.visibility]),
    );

    expect(states).toMatchObject({
      "village-gate": "visited",
      "arfelon-square": "current",
      smithy: "discovered",
    });
    expect(getAtlasDiscoveryProgress(state, "surface")).toMatchObject({
      discovered: 3,
      visited: 2,
    });
  });

  it("מציג מעבר בין שכבות רק לאחר גילוי שני קצותיו", () => {
    const hiddenDestination: AtlasStateInput = {
      ...baseState,
      currentLocationId: "mine-entrance",
      discoveredLocationIds: ["mine-entrance"],
      visitedLocationIds: ["mine-entrance"],
      flags: { tutorial_enemy_defeated: true },
    };
    expect(getVisibleAtlasPassages(hiddenDestination, "surface")).toHaveLength(0);

    const revealedDestination: AtlasStateInput = {
      ...hiddenDestination,
      discoveredLocationIds: ["mine-entrance", "main-tunnel"],
    };
    expect(getVisibleAtlasPassages(revealedDestination, "surface")).toEqual([
      expect.objectContaining({ id: "mine-descent" }),
    ]);
    expect(getVisibleAtlasPassages(revealedDestination, "depths")).toEqual([
      expect.objectContaining({ id: "mine-descent" }),
    ]);
  });

  it("קושר כל עוגן דינמי להשלכה עברית קיימת", () => {
    for (const anchor of atlasAnnotationAnchors) {
      const consequence = getFlagConsequence(anchor.flag);
      expect(consequence?.title).toBeTruthy();
      expect(consequence?.detail).toBeTruthy();
      expect(atlasNodeByLocationId[anchor.locationId].layer).toBe(anchor.layer);
    }
  });
});
