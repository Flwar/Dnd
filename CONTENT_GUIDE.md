# Authored Content Guide

The Shattered Crown uses authored TypeScript data and deterministic rules. Content is not stored in React components and does not depend on a live AI service. This guide explains how to add a location, NPC, dialogue, quest, item, ability, enemy, encounter, chapter, and its assets without breaking saves or multiplayer authority.

## Before editing content

Read the relevant interfaces in `src/types/game.ts` and use them directly. The key content collections are:

| Content | Definition file | Primary type |
| --- | --- | --- |
| Races | `src/content/races.ts` | `CharacterRace` |
| Classes | `src/content/classes.ts` | `CharacterClass` |
| Backgrounds | `src/content/backgrounds.ts` | `CharacterBackground` |
| Abilities | `src/content/abilities.ts` | `Ability` |
| Statuses | `src/content/statuses.ts` | `StatusDefinition` |
| Items | `src/content/items.ts` | `Item` |
| NPCs | `src/content/npcs.ts` | `NPC` |
| Dialogues | `src/content/dialogues.ts` | `DialogueNode` |
| Quests | `src/content/quests.ts` | `Quest` |
| Locations | `src/content/locations.ts` | `Location` |
| Enemies and encounters | `src/content/enemies.ts` | `Enemy`, `Encounter` |
| Chapters and scenes | `src/content/chapters/` | `ChapterDefinition`, `SceneDefinition` |
| Visual assets | `src/lib/assets/manifest.ts` | `AssetManifestEntry` |

Follow these rules for every change:

- All player-facing names, descriptions, labels, logs, errors, narration, and alt text are natural Hebrew.
- Never reverse Hebrew strings manually. RTL is a layout concern.
- IDs are stable, lowercase, ASCII kebab-case, and never reused for a different meaning.
- A released ID is part of the save and multiplayer protocol. Rename it only with a save migration and database migration.
- Content files import domain types, not React, Supabase, browser APIs, or server actions.
- Every referenced ID and asset key must exist.
- Failure should usually produce a consequence or alternate route rather than an unwinnable state.
- Persistent rewards need database idempotency, not only a local story flag.

## Recommended change workflow

1. Choose stable IDs and list every cross-reference before editing.
2. Add or prepare local assets and update credits.
3. Add the smallest content definition and its lookup map.
4. Wire incoming and outgoing references.
5. Add or update integrity and rule tests.
6. If the change affects persisted or authoritative state, add a new SQL migration.
7. Run focused tests, then the full quality gates.
8. Play the branch in Hebrew at desktop and mobile widths.

Do not modify an already-applied shared migration. Create a new one with:

```bash
npx supabase migration new add_northern_watchtower_content
```

## Stable IDs and story flags

Use a namespace that makes collisions unlikely:

```text
location:      ruined-watchtower
interaction:   inspect-watchtower-bell
npc:           yael-scout
dialogue:      yael-watchtower-intro
quest:         watchtower-signal
objective:     relight-brazier
item:          watchtower-key
ability:       ranger-warning-shot
enemy:         fogbound-sentinel
encounter:     watchtower-sentinels
scene:         scene-ruined-watchtower
flag:          watchtower_bell_heard
reward key:    chapter2.watchtower_secret
```

Content IDs use kebab-case because they appear in routes, save data, SQL checks, and command payloads. Existing story flags use snake_case; keep one style within a flag family. Do not encode translated display text in an ID.

## Adding visual assets

The canonical production manifest is `src/lib/assets/manifest.ts`. Runtime content refers to an asset key; only the manifest knows the local path.

1. Create, license, or generate the asset with a documented commercial-use basis.
2. Store it under the appropriate `public/assets/rebuild` directory.
3. Use WebP or AVIF for raster art and optimize it before committing.
4. For a location background, provide a wide desktop image and a portrait-oriented `-mobile` variant.
5. Add stable entries to `src/lib/assets/manifest.ts`.
6. Add provenance, creator/source, license, attribution, and modifications to `ASSET_CREDITS.md`.
7. Use `getAssetPath("asset-key")`; do not hardcode a remote URL.

Production raster optimization uses Sharp with `effort: 6` and `smartSubsample: true`. Resize wide backgrounds to `1024×576` at WebP quality 55, mobile backgrounds to `576×720` at quality 55, portraits to `288×360` at quality 62, and square item/ability art to `160×160` at quality 70. Keep the social preview at `1200×630`. Write optimized files to a separate directory first, compare representative dark and high-detail scenes at their actual UI size, then replace the repository copies only after the full manifest remains complete. Finish by running `npm run test:unit`, `npm run build`, and the desktop/mobile browser smoke tests; lossy recompression must not be applied repeatedly to already optimized files.

Locally hosted fonts and code-rendered icon libraries are assets too. Record their exact package or file path, upstream project, license, required notice, and modifications in `ASSET_CREDITS.md`, even though they do not belong in the scene-art manifest.

Example keys:

```ts
getAssetPath("background-ruined-watchtower");
getAssetPath("background-ruined-watchtower-mobile");
getAssetPath("portrait-npc-yael");
getAssetPath("item-watchtower-key");
```

If a content-facing manifest export remains under `src/content`, it must derive from or stay synchronized with the canonical manifest; do not introduce a second set of divergent runtime paths.

Asset acceptance checklist:

- no embedded words, logos, watermarks, or recognizable copyrighted characters;
- no hotlink or expiring URL;
- no placeholder silhouette presented as final art;
- dimensions match the composition in which it is used;
- meaningful Hebrew alt text is supplied by the UI, not baked into the image;
- the asset appears in `ASSET_CREDITS.md`.

## Adding a location

Add a typed object to `src/content/locations.ts` and let `locationsById` derive its lookup entry.

```ts
const ruinedWatchtower: Location = {
  id: "ruined-watchtower",
  name: "מגדל השמירה החרב",
  description: "אבני המגדל נוטות אל הערפל כאילו הן מאזינות לו.",
  backgroundAssetKey: "background-ruined-watchtower",
  ambienceSoundKey: "ambience-wind-and-stone",
  interactions: [
    {
      id: "inspect-watchtower-bell",
      label: "בדיקת הפעמון הסדוק",
      description: "סימן עין נשבר נחרט בתוך המתכת.",
      oneTime: true,
      skillCheck: {
        skill: "investigation",
        attribute: "intelligence",
        difficulty: 13,
        proficiency: false,
        successEffects: [
          { kind: "set-flag", key: "watchtower_bell_understood", value: true },
          { kind: "experience", amount: 25 },
        ],
        failureEffects: [
          { kind: "set-flag", key: "watchtower_bell_heard", value: true },
        ],
      },
    },
  ],
  exits: [
    { destinationId: "mine-road", label: "חזרה לדרך המכרה" },
  ],
  npcIds: ["yael-scout"],
  lootItemIds: ["watchtower-key"],
  secretIds: ["watchtower-bell-origin"],
};
```

Then verify:

- every exit destination exists and at least one reachable location links into the new location;
- every `dialogueNodeId` and `encounterId` exists;
- every item, NPC, condition, and effect ID exists;
- the scene uses the location's interaction IDs where appropriate;
- a one-time interaction receives a stable completion flag through the runtime;
- desktop and mobile art keys resolve;
- the location can be reached without exposing a hidden branch prematurely.

## Adding an NPC

An NPC needs more than a name and portrait.

1. Add a local portrait and manifest entry.
2. Add an `NPC` to `src/content/npcs.ts` with Hebrew description, personality, initial relationship, journal entry, and reactive lines.
3. Add at least one dialogue node.
4. Add the NPC ID to relevant locations.
5. Add story conditions or flags that select reactive lines.
6. Update integrity tests when the NPC is required by a chapter.

Example:

```ts
const yael: NPC = {
  id: "yael-scout",
  name: "יעל",
  title: "סיירת הגבעות",
  description: "סיירת עייפה שמכירה כל אבן סביב ערפלון.",
  personality: ["זהירה", "חדת הבחנה", "נאמנה לכפר"],
  portraitKey: "portrait-npc-yael",
  initialRelationship: {
    npcId: "yael-scout",
    trust: 0,
    respect: 0,
    fear: 0,
  },
  journalEntry: "יעל שומרת על הדרכים מאז שרעידת האדמה פתחה שבילים שאינם מופיעים במפה.",
  reactiveLines: {
    watchtower_bell_understood: "אז גם אתה שמעת מה שהפעמון הסתיר.",
    danor_rescued: "דנור חזר בזכותך. הכפר לא ישכח זאת.",
    default: "הערפל סמיך מדי הלילה.",
  },
};
```

Relationships are clamped to `-100..100`. Use small changes for ordinary reactions and reserve large changes for consequential choices.

## Adding branching dialogue

Add `DialogueNode` objects to `src/content/dialogues.ts`. Keep nodes small enough that each choice is meaningful. A node can have conditions, entry effects, one-time behavior, skill checks, story effects, a next node, or an exit action.

```ts
const intro: DialogueNode = {
  id: "yael-watchtower-intro",
  npcId: "yael-scout",
  portraitKey: "portrait-npc-yael",
  emotionalState: "דרוכה",
  text: "הפעמון צלצל בלי רוח. אם תעלה למגדל, אל תענה לקול שקורא בשמך.",
  choices: [
    {
      id: "yael-ask-about-voice",
      text: "איזה קול שמעת?",
      approach: "curious",
      effects: [
        { kind: "relationship", npcId: "yael-scout", field: "trust", amount: 3 },
      ],
      nextNodeId: "yael-watchtower-warning",
    },
    {
      id: "yael-dismiss-warning",
      text: "אבן ישנה אינה מדברת.",
      approach: "direct",
      effects: [
        { kind: "set-flag", key: "yael_warning_dismissed", value: true },
      ],
      exitAction: "close",
    },
  ],
  oneTime: true,
};
```

Dialogue review checklist:

- every `nextNodeId` exists;
- every NPC and portrait key exists;
- each visible choice has a distinct intent, not a paraphrase of the same action;
- class/race/background choices use matching conditions and Hebrew labels;
- skill-check failure has authored effects;
- consequences are encoded as effects rather than hidden component callbacks;
- an exit action matches what the game runtime can perform;
- online voting uses stable node/decision/choice IDs and does not expose hidden consequences.

The supported `StoryCondition` variants are flag, item, race, class, background, relationship, and quest. The supported `StoryEffect` variants are flag, relationship, reputation, item grant, quest start, objective update, experience, and healing. Extend the discriminated unions and their exhaustive evaluators together if a new variant is required.

## Adding a quest

Add a `Quest` to `src/content/quests.ts` with stable objectives and a reward definition.

```ts
const watchtowerSignal: Quest = {
  id: "watchtower-signal",
  name: "האות מן המגדל",
  description: "גלו מי הפעיל את הפעמון החרב.",
  type: "optional",
  objectives: [
    {
      id: "reach-watchtower",
      text: "הגיעו למגדל השמירה.",
      optional: false,
      status: "active",
    },
    {
      id: "decode-bell",
      text: "פענחו את הסימן שבתוך הפעמון.",
      optional: true,
      hiddenUntilFlag: "watchtower_bell_seen",
      status: "hidden",
    },
  ],
  rewards: {
    experience: 90,
    gold: 20,
    itemIds: ["watchtower-key"],
    reputation: 2,
  },
};
```

Start and advance it through authored effects:

```ts
{ kind: "quest-start", questId: "watchtower-signal" }
{ kind: "quest-objective", questId: "watchtower-signal", objectiveId: "reach-watchtower", status: "completed" }
```

Required objectives complete the quest; optional objectives do not block completion. `hiddenUntilFlag` prevents premature journal spoilers. Test completion, hidden-objective reveal, and duplicate reward prevention.

For a persistent online or chapter reward, also add an idempotent row to `supabase/seed.sql` or a migration and grant it through the trusted reward RPC with a unique scope. A TypeScript quest reward alone is not sufficient authority for a multiplayer cloud reward.

## Adding an item

Add an item icon, manifest entry, and `Item` definition in `src/content/items.ts`.

```ts
const watchtowerKey: Item = {
  id: "watchtower-key",
  name: "מפתח המגדל",
  description: "מפתח ברזל דק שפניו חרוטים בשבעה קווים.",
  category: "quest",
  rarity: "uncommon",
  iconAssetKey: "item-watchtower-key",
  weight: 0.1,
  value: 0,
  stackLimit: 1,
  questItem: true,
  unique: true,
  usable: false,
  consumable: false,
};
```

For equipment, define the slot, restrictions, minimum level, two-handed behavior, armor or damage formula, and stat modifiers. For consumables, define healing/resource behavior and set `usable` and `consumable` consistently.

Test at least:

- stack limits and unique-item behavior;
- use and quantity decrement;
- quest-item drop rejection;
- rare-item confirmation behavior in the UI;
- class/race/level restrictions;
- two-handed/offhand compatibility;
- equip/unequip stat recalculation.

If an item is granted by `create_character` or a trusted reward, update the SQL allowlist/seed in a new migration. The database cannot safely infer a new TypeScript item at runtime.

## Adding an ability or status

Statuses live in `src/content/statuses.ts`. Abilities live in `src/content/abilities.ts`. Add the status first when an ability applies one.

```ts
const warningShot: Ability = {
  id: "ranger-warning-shot",
  classId: "ranger",
  name: "חץ אזהרה",
  description: "חץ החולף ליד המטרה ומערער את דיוקה.",
  iconAssetKey: "ability-warning-shot",
  cost: 2,
  cooldown: 2,
  target: "enemy",
  formula: {
    diceCount: 1,
    diceSides: 6,
    flatBonus: 1,
    attribute: "dexterity",
    damageType: "piercing",
  },
  animationKey: "warning-shot",
  soundKey: "bow",
  statusEffects: [
    { statusId: "shaken", duration: 2, chance: 0.8 },
  ],
  availability: { kind: "always" },
  logText: "החץ של {actor} חולף ליד {target} ומערער את עמידתו.",
};
```

Do not create cosmetic duplicates of an existing action. Make cost, target, formula, status, cooldown, or availability materially different. Combat log templates must remain Hebrew and support the placeholders expected by the engine.

If it is a starting class ability, add its ID to the class's three-element `startingAbilityIds` tuple and extend the class tests. If it is an enemy ability, add it to that enemy and its Hebrew intent label.

## Adding an enemy and encounter

Add the enemy to `src/content/enemies.ts`, then add one or more encounters that reference it.

An enemy requires attributes, health, armor, accuracy, initiative, ability IDs, experience, loot, a portrait, and Hebrew intent labels. A boss also defines guard points, an exposed-rune status, a heavy attack, a telegraph status, and the story flag that grants investigative advantage.

An encounter requires:

- a stable ID and Hebrew name;
- valid enemy IDs;
- a clear Hebrew objective;
- a reasonable escape difficulty;
- a checkpoint ID;
- optional tutorial steps.

For multiplayer, update the authoritative SQL command allowlist when `BEGIN_ENCOUNTER` accepts a new encounter. Never accept an arbitrary client-provided enemy list. Run balance tests at each supported party size and average level; all starter classes must retain a viable route to victory.

Test initiative, target legality, damage and armor, healing caps, costs, cooldowns, status duration, victory/defeat, deterministic seeds, boss scaling, and reward idempotency.

## Adding a chapter

Create a chapter module under `src/content/chapters` and export it from `src/content/chapters/index.ts`. A chapter contains a `ChapterDefinition` and ordered `SceneDefinition` objects.

Each scene declares:

- stable ID and sequence number;
- Hebrew title, description, and entry narration;
- a valid location ID;
- interaction IDs that exist at that location;
- required flags and completion conditions;
- valid next-scene IDs;
- whether a cinematic is skippable.

Then align every persistence and multiplayer boundary:

1. Add the chapter to the authored chapter registry.
2. Add its quest, locations, dialogues, encounters, and final reward.
3. Add a new database migration for any chapter/reward allowlists or new relational data.
4. Use one canonical chapter ID in content, character rows, save snapshots, party sessions, server actions, and tests.
5. Add the starting scene to party-session creation and reconnection logic.
6. Add chapter completion through the service-role-only idempotent reward path.
7. Add a summary and a hook to the next chapter.
8. Add unit integrity tests and at least one end-to-end completion path.

Never silently reinterpret an existing chapter ID. If a released save uses an older ID, add an explicit save migration and data migration.

## Adding a new story effect or condition

Only add a new discriminated-union variant when existing primitives cannot express the consequence.

Update all of these together:

1. `StoryCondition` or `StoryEffect` in `src/types/game.ts`.
2. Exhaustive evaluation/application in `src/game/dialogue`.
3. Runtime save composition in `src/lib/game/session-state.ts` if persistence is affected.
4. Zod save schemas when the saved shape changes.
5. Multiplayer payload validation and SQL authoritative validation when usable online.
6. Unit tests for success, failure, invalid data, and replay.
7. This guide if the authoring surface changes.

Do not encode arbitrary executable behavior in JSON or content callbacks.

## Save schema changes

When adding persisted state:

1. Define a new `SaveDataV<N>` interface.
2. Add a strict Zod schema.
3. Extend the discriminated union of readable versions.
4. Add a deterministic migration from every supported prior version.
5. Preserve ownership, character ID, rewarded-event IDs, and timestamps.
6. Add round-trip, invalid-data, and migration tests.
7. Add a PostgreSQL migration if relational columns or snapshot handling change.
8. Verify load fallback from relational rows.

Never mutate an old save object in place and never accept unknown save versions as current.

## Database-backed content

The database intentionally validates more narrowly than the browser. Review SQL whenever content adds:

- a race, class, or background;
- starter inventory or equipment;
- a reward key or reward item;
- a chapter ID or encounter accepted by a party command;
- a new command or payload field;
- a new equipment slot or status persisted relationally.

Use a new migration, update `src/types/database.ts` to match the deployed contract, and add SQL security tests. Keep ownership based on `auth.uid()`; never add an owner ID solely because the client supplied it.

## Hebrew, RTL, and accessibility review

Content review is incomplete until it is rendered.

- Check long Hebrew paragraphs at mobile and desktop widths.
- Wrap room codes, email addresses, keyboard keys, versions, and numeric formulas with direction isolation in the UI.
- Do not place punctuation by manually reversing it.
- Keep button and choice text understandable without color or icons.
- Give every portrait and scene meaningful Hebrew alternative text at its usage site.
- Verify keyboard access to every dialogue choice and combat action.
- Ensure hidden quest information is absent from the accessibility tree, not merely visually dimmed.
- Respect reduced motion for new presentation effects.

## Testing content changes

Run the focused content and domain tests first:

```bash
npx vitest run tests/unit/content-integrity.test.ts
npm run test:unit
```

Then run the complete quality gates. `npm test` already includes the unit, integration, and migration-contract security suites, so it does not need a second integration invocation:

```bash
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run db:lint
npm run db:test
npm run build
```

`db:validate` loads the migration and seed into an in-memory PostgreSQL-compatible engine and smoke-tests character creation, transactional relational save synchronization, and idempotent replay without Docker. It is fast and useful in every environment, but it does not replace Supabase CLI linting or the SQL RLS tests against a running local Supabase stack.

For a new playable branch, add stable `data-testid` values only where semantic queries are insufficient, then add a Playwright flow that reaches the branch, applies its consequence, saves, reloads, and confirms persistence.

For online content, use two authenticated browser contexts and verify:

- both clients resolve the same IDs and session version;
- only the active character may submit a combat action;
- a duplicate command returns the prior result;
- a refreshed client restores the current scene/turn;
- a reward cannot be claimed twice.

## Content pull-request checklist

- [ ] Player-facing copy is natural Hebrew.
- [ ] IDs are stable and collision-free.
- [ ] All references resolve.
- [ ] Success, failure, and critical outcomes are authored where relevant.
- [ ] Hidden information remains hidden until its flag is set.
- [ ] Art is local, optimized, manifested, and credited.
- [ ] Desktop and mobile compositions were inspected.
- [ ] Rewards are idempotent in save state and the database where persistent.
- [ ] Authoritative SQL accepts only intended content IDs.
- [ ] Save and database migrations exist when required.
- [ ] Unit, integration, database, build, and relevant browser checks pass.
