import type {
  Combatant,
  DialogueInput,
  DialogueNode,
  DialogueOutput,
  Encounter,
  EncounterInput,
  EncounterOutput,
  Enemy,
  Location,
  NarrativeProvider,
  SceneDefinition,
  SceneInput,
  SceneOutput,
} from "../../types/game";
import { createCombatantFromEnemy, scaleEnemy } from "../combat";

export interface AuthoredContentRepository {
  scenes: Readonly<Record<string, SceneDefinition>>;
  locations: Readonly<Record<string, Location>>;
  dialogues: Readonly<Record<string, DialogueNode>>;
  encounters: Readonly<Record<string, Encounter>>;
  enemies: Readonly<Record<string, Enemy>>;
}

export class AuthoredNarrativeProvider implements NarrativeProvider {
  constructor(private readonly content: AuthoredContentRepository) {}

  async getScene(input: SceneInput): Promise<SceneOutput> {
    const scene = this.content.scenes[input.sceneId];
    if (!scene) throw new Error(`סצנה לא מוכרת: ${input.sceneId}`);
    const location = this.content.locations[scene.locationId];
    if (!location) throw new Error(`מיקום לא מוכר: ${scene.locationId}`);
    const availableInteractions = location.interactions.filter((interaction) => {
      if (!interaction.conditions) return true;
      return interaction.conditions.every((condition) => {
        if (condition.kind === "flag") return input.story.flags[condition.key] === condition.value;
        if (condition.kind === "race") return input.character.raceId === condition.raceId;
        if (condition.kind === "class") return input.character.classId === condition.classId;
        if (condition.kind === "background") return input.character.backgroundId === condition.backgroundId;
        return true;
      });
    });
    return { scene, availableInteractions };
  }

  async resolveDialogue(input: DialogueInput): Promise<DialogueOutput> {
    const node = this.content.dialogues[input.nodeId];
    if (!node) throw new Error(`שיחה לא מוכרת: ${input.nodeId}`);
    const availableChoices = node.choices.filter((choice) =>
      (choice.conditions ?? []).every((condition) => {
        if (condition.kind === "flag") return input.story.flags[condition.key] === condition.value;
        if (condition.kind === "race") return input.character.raceId === condition.raceId;
        if (condition.kind === "class") return input.character.classId === condition.classId;
        if (condition.kind === "background") return input.character.backgroundId === condition.backgroundId;
        if (condition.kind === "relationship") {
          const relationship = input.story.relationships[condition.npcId];
          return relationship ? Number(relationship[condition.field]) >= condition.value : false;
        }
        return true;
      }),
    );
    return { node, availableChoices };
  }

  async generateEncounter(input: EncounterInput): Promise<EncounterOutput> {
    const encounter = this.content.encounters[input.encounterId];
    if (!encounter) throw new Error(`עימות לא מוכר: ${input.encounterId}`);
    const combatants: Combatant[] = encounter.enemyIds.map((enemyId, index) => {
      const enemy = this.content.enemies[enemyId];
      if (!enemy) throw new Error(`אויב לא מוכר: ${enemyId}`);
      const scaled = scaleEnemy(enemy, input.partySize, input.averageLevel);
      const exposed = Boolean(enemy.boss && input.story.flags[enemy.boss.investigationAdvantageFlag]);
      return createCombatantFromEnemy(
        scaled,
        `enemy-${index + 1}-${enemyId}`,
        exposed && enemy.boss
          ? [{ statusId: enemy.boss.exposedRuneStatusId, remainingTurns: 2, stacks: 1, sourceCombatantId: "story" }]
          : [],
      );
    });
    return { encounter, combatants };
  }
}
