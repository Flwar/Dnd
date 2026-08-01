export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PartyStatus = "open" | "active" | "closed";
export type SessionStatus = "forming" | "active" | "completed" | "abandoned";
export type QuestStatus = "active" | "completed" | "failed";
export type CommandStatus = "pending" | "accepted" | "rejected";

type InsertShape<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;
type UpdateShape<Row> = Partial<Row>;
type TableDefinition<Row, Insert, Update = UpdateShape<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  account_role: "player" | "administrator";
  account_title: string | null;
  is_king: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  total_playtime_seconds: number;
  highest_character_level: number;
  completed_chapter_count: number;
};

export type PlayerPresenceConnectionRow = {
  connection_id: string;
  user_id: string;
  connected_at: string;
  last_seen_at: string;
};

export type PlayerPresenceEventRow = {
  id: number;
  user_id: string;
  event_type: "joined" | "left";
  display_name: string;
  avatar_key: string;
  account_title: string | null;
  is_king: boolean;
  created_at: string;
};

export type CharacterRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  form_of_address: string | null;
  race_id: string;
  class_id: string;
  background_id: string;
  portrait_key: string;
  level: number;
  experience: number;
  current_health: number;
  maximum_health: number;
  primary_resource_type: string;
  primary_resource: number;
  maximum_primary_resource: number;
  gold: number;
  reputation: number;
  current_location_id: string;
  chapter_id: string;
  save_version: number;
  created_at: string;
  updated_at: string;
  last_played_at: string;
  is_active: boolean;
};

export type CharacterAttributesRow = {
  character_id: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type CharacterInventoryRow = {
  id: string;
  character_id: string;
  item_id: string;
  quantity: number;
  durability: number | null;
  custom_data: Json;
  acquired_at: string;
};

export type CharacterEquipmentRow = {
  character_id: string;
  slot: string;
  inventory_entry_id: string;
  equipped_at: string;
};

export type CharacterQuestRow = {
  character_id: string;
  quest_id: string;
  status: QuestStatus;
  current_stage: number;
  started_at: string;
  completed_at: string | null;
  quest_data: Json;
};

export type CharacterStoryFlagRow = {
  character_id: string;
  flag_key: string;
  value: Json;
  updated_at: string;
};

export type CharacterRelationshipRow = {
  character_id: string;
  npc_id: string;
  trust: number;
  respect: number;
  fear: number;
  relationship_data: Json;
  updated_at: string;
};

export type CharacterDiscoveredLocationRow = {
  character_id: string;
  location_id: string;
  discovered_at: string;
  visited_at: string | null;
};

export type CharacterChapterCompletionRow = {
  character_id: string;
  chapter_id: string;
  completion_summary: Json;
  completed_at: string;
};

export type SaveSnapshotRow = {
  id: string;
  character_id: string;
  save_version: number;
  snapshot: Json;
  save_reason: string;
  created_at: string;
};

export type SaveCommandRow = {
  command_id: string;
  character_id: string;
  snapshot_id: string;
  created_at: string;
};

export type CharacterCreationRequestRow = {
  command_id: string;
  owner_id: string;
  character_id: string;
  created_at: string;
};

export type PartyRow = {
  id: string;
  leader_character_id: string;
  room_code: string;
  name: string;
  status: PartyStatus;
  maximum_members: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type PartyMemberRow = {
  party_id: string;
  character_id: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  ready_state: boolean;
  connection_state: string;
  last_seen_at: string;
};

export type PartySessionRow = {
  id: string;
  party_id: string;
  chapter_id: string;
  session_state: Json;
  current_scene_id: string;
  current_turn: number;
  status: SessionStatus;
  version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type PartyEventRow = {
  id: string;
  session_id: string;
  event_type: string;
  payload: Json;
  created_by_character_id: string | null;
  sequence_number: number;
  created_at: string;
};

export type PartyCommandRow = {
  command_id: string;
  session_id: string;
  character_id: string;
  command_type: string;
  expected_session_version: number;
  server_seed: number;
  payload: Json;
  status: CommandStatus;
  result: Json | null;
  created_at: string;
  processed_at: string | null;
};

export type PartyVoteRow = {
  session_id: string;
  scene_id: string;
  decision_id: string;
  character_id: string;
  choice_id: string;
  created_at: string;
  updated_at: string;
};

export type RewardDefinitionRow = {
  reward_key: string;
  item_id: string | null;
  item_quantity: number;
  gold: number;
  experience: number;
  metadata: Json;
  enabled: boolean;
};

export type RewardClaimRow = {
  id: string;
  idempotency_key: string;
  character_id: string;
  reward_key: string;
  scope_key: string;
  granted_item_entry_id: string | null;
  granted_gold: number;
  granted_experience: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        ProfileRow,
        InsertShape<ProfileRow, "id" | "display_name">
      >;
      characters: TableDefinition<
        CharacterRow,
        InsertShape<
          CharacterRow,
          | "owner_id"
          | "name"
          | "race_id"
          | "class_id"
          | "background_id"
          | "portrait_key"
          | "current_health"
          | "maximum_health"
          | "primary_resource_type"
          | "maximum_primary_resource"
        >
      >;
      character_attributes: TableDefinition<
        CharacterAttributesRow,
        CharacterAttributesRow
      >;
      character_inventory: TableDefinition<
        CharacterInventoryRow,
        InsertShape<CharacterInventoryRow, "character_id" | "item_id">
      >;
      character_equipment: TableDefinition<
        CharacterEquipmentRow,
        InsertShape<
          CharacterEquipmentRow,
          "character_id" | "slot" | "inventory_entry_id"
        >
      >;
      character_quests: TableDefinition<
        CharacterQuestRow,
        InsertShape<CharacterQuestRow, "character_id" | "quest_id">
      >;
      character_story_flags: TableDefinition<
        CharacterStoryFlagRow,
        InsertShape<CharacterStoryFlagRow, "character_id" | "flag_key" | "value">
      >;
      character_relationships: TableDefinition<
        CharacterRelationshipRow,
        InsertShape<CharacterRelationshipRow, "character_id" | "npc_id">
      >;
      character_discovered_locations: TableDefinition<
        CharacterDiscoveredLocationRow,
        InsertShape<CharacterDiscoveredLocationRow, "character_id" | "location_id">
      >;
      character_chapter_completions: TableDefinition<
        CharacterChapterCompletionRow,
        InsertShape<CharacterChapterCompletionRow, "character_id" | "chapter_id">
      >;
      save_snapshots: TableDefinition<
        SaveSnapshotRow,
        InsertShape<
          SaveSnapshotRow,
          "character_id" | "save_version" | "snapshot" | "save_reason"
        >
      >;
      save_commands: TableDefinition<
        SaveCommandRow,
        InsertShape<SaveCommandRow, "command_id" | "character_id" | "snapshot_id">
      >;
      character_creation_requests: TableDefinition<
        CharacterCreationRequestRow,
        InsertShape<
          CharacterCreationRequestRow,
          "command_id" | "owner_id" | "character_id"
        >
      >;
      parties: TableDefinition<
        PartyRow,
        InsertShape<PartyRow, "leader_character_id" | "room_code" | "name">
      >;
      party_members: TableDefinition<
        PartyMemberRow,
        InsertShape<PartyMemberRow, "party_id" | "character_id">
      >;
      party_sessions: TableDefinition<
        PartySessionRow,
        InsertShape<
          PartySessionRow,
          "party_id" | "chapter_id" | "current_scene_id"
        >
      >;
      party_events: TableDefinition<
        PartyEventRow,
        InsertShape<
          PartyEventRow,
          "session_id" | "event_type" | "sequence_number"
        >
      >;
      party_commands: TableDefinition<
        PartyCommandRow,
        InsertShape<
          PartyCommandRow,
          | "command_id"
          | "session_id"
          | "character_id"
          | "command_type"
          | "expected_session_version"
        >
      >;
      party_votes: TableDefinition<
        PartyVoteRow,
        InsertShape<
          PartyVoteRow,
          "session_id" | "scene_id" | "decision_id" | "character_id" | "choice_id"
        >
      >;
      reward_definitions: TableDefinition<
        RewardDefinitionRow,
        InsertShape<RewardDefinitionRow, "reward_key">
      >;
      reward_claims: TableDefinition<
        RewardClaimRow,
        InsertShape<
          RewardClaimRow,
          "idempotency_key" | "character_id" | "reward_key" | "scope_key"
        >
      >;
      player_presence_connections: TableDefinition<
        PlayerPresenceConnectionRow,
        InsertShape<PlayerPresenceConnectionRow, "connection_id" | "user_id">
      >;
      player_presence_events: TableDefinition<
        PlayerPresenceEventRow,
        InsertShape<
          PlayerPresenceEventRow,
          "user_id" | "event_type" | "display_name" | "avatar_key"
        >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      apply_party_command_result: {
        Args: {
          p_command_id: string;
          p_expected_session_version: number;
          p_success: boolean;
          p_result: Json;
          p_state_patch?: Json;
        };
        Returns: Json;
      };
      resolve_party_loot_claim: {
        Args: {
          p_command_id: string;
          p_expected_session_version: number;
        };
        Returns: Json;
      };
      close_party: {
        Args: { p_party_id: string };
        Returns: Json;
      };
      complete_character_chapter: {
        Args: {
          p_idempotency_key: string;
          p_character_id: string;
          p_chapter_id: string;
          p_reward_key: string;
          p_completion_summary?: Json;
        };
        Returns: Json;
      };
      create_character: {
        Args: {
          p_name: string;
          p_race_id: string;
          p_class_id: string;
          p_background_id: string;
          p_portrait_key: string;
          p_attributes: Json;
          p_description?: string | null;
          p_form_of_address?: string | null;
          p_command_id?: string;
        };
        Returns: Json;
      };
      create_party: {
        Args: {
          p_leader_character_id: string;
          p_name: string;
          p_maximum_members?: number;
        };
        Returns: { party_id: string; room_code: string }[];
      };
      get_active_party_session: {
        Args: { p_character_id: string };
        Returns: Json;
      };
      get_latest_character_save: {
        Args: { p_character_id: string };
        Returns: {
          snapshot_id: string;
          save_version: number;
          snapshot: Json;
          save_reason: string;
          created_at: string;
        }[];
      };
      get_party_roster: {
        Args: { p_party_id: string };
        Returns: {
          character_id: string;
          display_name: string;
          character_name: string;
          portrait_key: string;
          class_id: string;
          level: number;
          current_health: number;
          maximum_health: number;
          member_role: string;
          ready_state: boolean;
          connection_state: string;
          last_seen_at: string;
        }[];
      };
      grant_character_reward: {
        Args: {
          p_idempotency_key: string;
          p_character_id: string;
          p_reward_key: string;
          p_scope_key: string;
        };
        Returns: Json;
      };
      heartbeat_player_presence: {
        Args: { p_connection_id: string };
        Returns: Json;
      };
      disconnect_player_presence: {
        Args: { p_connection_id: string };
        Returns: Json;
      };
      get_online_players: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          display_name: string;
          avatar_key: string;
          account_title: string | null;
          is_king: boolean;
          connection_count: number;
          last_seen_at: string;
        }[];
      };
      provision_account_access: {
        Args: {
          p_user_id: string;
          p_account_role: "player" | "administrator";
          p_is_king?: boolean;
        };
        Returns: Json;
      };
      join_party_by_code: {
        Args: { p_character_id: string; p_room_code: string };
        Returns: Json;
      };
      leave_party: {
        Args: { p_party_id: string; p_character_id: string };
        Returns: Json;
      };
      remove_party_member: {
        Args: { p_party_id: string; p_character_id: string };
        Returns: Json;
      };
      resolve_party_vote: {
        Args: { p_session_id: string; p_scene_id: string; p_decision_id: string };
        Returns: Json;
      };
      save_character_snapshot: {
        Args: {
          p_command_id: string;
          p_character_id: string;
          p_expected_save_version: number;
          p_snapshot: Json;
          p_save_reason?: string;
        };
        Returns: Json;
      };
      set_party_ready: {
        Args: { p_party_id: string; p_character_id: string; p_ready: boolean };
        Returns: Json;
      };
      start_party_session: {
        Args: { p_party_id: string; p_chapter_id?: string };
        Returns: Json;
      };
      submit_party_command: {
        Args: {
          p_command_id: string;
          p_session_id: string;
          p_character_id: string;
          p_expected_session_version: number;
          p_command_type: string;
          p_payload?: Json;
        };
        Returns: Json;
      };
      transfer_party_leadership: {
        Args: { p_party_id: string; p_new_leader_character_id: string };
        Returns: Json;
      };
      update_party_connection: {
        Args: {
          p_party_id: string;
          p_character_id: string;
          p_connection_state: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      party_status: PartyStatus;
      session_status: SessionStatus;
      quest_status: QuestStatus;
      command_status: CommandStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
