export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          resting_hr: number;
          date_of_birth: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          current_streak: number;
          last_streak_date: string | null;
          bio: string | null;
          daily_step_goal: number;
          push_token: string | null;
          notify_daily_reminder: boolean;
          notify_streak_warning: boolean;
          notify_achievements: boolean;
          notify_friend_requests: boolean;
          notify_weekly_summary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          resting_hr?: number;
          date_of_birth?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          current_streak?: number;
          last_streak_date?: string | null;
          bio?: string | null;
          daily_step_goal?: number;
          push_token?: string | null;
          notify_daily_reminder?: boolean;
          notify_streak_warning?: boolean;
          notify_achievements?: boolean;
          notify_friend_requests?: boolean;
          notify_weekly_summary?: boolean;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          resting_hr?: number;
          date_of_birth?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          bio?: string | null;
          current_streak?: number;
          last_streak_date?: string | null;
          daily_step_goal?: number;
          push_token?: string | null;
          notify_daily_reminder?: boolean;
          notify_streak_warning?: boolean;
          notify_achievements?: boolean;
          notify_friend_requests?: boolean;
          notify_weekly_summary?: boolean;
        };
        Relationships: [];
      };
      daily_steps: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          step_count: number;
          xp_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          step_count: number;
          xp_earned?: number;
        };
        Update: {
          step_count?: number;
          xp_earned?: number;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          status: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number;
          distance_meters: number;
          avg_pace_seconds_per_km: number | null;
          avg_heart_rate: number | null;
          hr_source: string | null;
          calories_estimate: number | null;
          xp_earned: number;
          name: string | null;
          description: string | null;
          perceived_effort: number | null;
          is_favorite: boolean;
          privacy: string;
          activity_subtype: string | null;
          gear_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          status?: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number;
          distance_meters?: number;
          avg_pace_seconds_per_km?: number | null;
          avg_heart_rate?: number | null;
          hr_source?: string | null;
          calories_estimate?: number | null;
          xp_earned?: number;
          name?: string | null;
          description?: string | null;
          perceived_effort?: number | null;
          is_favorite?: boolean;
          privacy?: string;
          activity_subtype?: string | null;
          gear_id?: string | null;
        };
        Update: {
          status?: string;
          ended_at?: string | null;
          duration_seconds?: number;
          distance_meters?: number;
          avg_pace_seconds_per_km?: number | null;
          avg_heart_rate?: number | null;
          hr_source?: string | null;
          calories_estimate?: number | null;
          xp_earned?: number;
          name?: string | null;
          description?: string | null;
          perceived_effort?: number | null;
          is_favorite?: boolean;
          privacy?: string;
          activity_subtype?: string | null;
          gear_id?: string | null;
        };
        Relationships: [];
      };
      gear: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          type: string;
          distance_meters: number;
          max_distance_meters: number | null;
          is_retired: boolean;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          brand?: string | null;
          type?: string;
          distance_meters?: number;
          max_distance_meters?: number | null;
          is_retired?: boolean;
          is_default?: boolean;
        };
        Update: {
          name?: string;
          brand?: string | null;
          type?: string;
          distance_meters?: number;
          max_distance_meters?: number | null;
          is_retired?: boolean;
          is_default?: boolean;
        };
        Relationships: [];
      };
      activity_waypoints: {
        Row: {
          id: string;
          activity_id: string;
          latitude: number;
          longitude: number;
          altitude: number | null;
          speed: number | null;
          timestamp: string;
          order_index: number;
        };
        Insert: {
          activity_id: string;
          latitude: number;
          longitude: number;
          altitude?: number | null;
          speed?: number | null;
          timestamp: string;
          order_index: number;
        };
        Update: {
          activity_id?: string;
          latitude?: number;
          longitude?: number;
          altitude?: number | null;
          speed?: number | null;
          timestamp?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      personal_bests: {
        Row: {
          id: string;
          user_id: string;
          distance_label: string;
          distance_meters: number;
          best_time_seconds: number;
          activity_id: string;
          achieved_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          distance_label: string;
          distance_meters: number;
          best_time_seconds: number;
          activity_id: string;
          achieved_at: string;
        };
        Update: {
          best_time_seconds?: number;
          activity_id?: string;
          achieved_at?: string;
        };
        Relationships: [];
      };
      xp_ledger: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          source_id: string | null;
          amount: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          source: string;
          source_id?: string | null;
          amount: number;
          description?: string | null;
        };
        Update: {
          user_id?: string;
          source?: string;
          source_id?: string | null;
          amount?: number;
          description?: string | null;
        };
        Relationships: [];
      };
      user_xp: {
        Row: {
          user_id: string;
          total_xp: number;
          current_level: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          current_level?: number;
        };
        Update: {
          total_xp?: number;
          current_level?: number;
        };
        Relationships: [];
      };
      achievement_definitions: {
        Row: {
          id: string;
          category: string;
          title: string;
          description: string;
          icon_name: string;
          threshold: number;
          xp_reward: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          category: string;
          title: string;
          description: string;
          icon_name?: string;
          threshold: number;
          xp_reward?: number;
          sort_order?: number;
        };
        Update: {
          category?: string;
          title?: string;
          description?: string;
          icon_name?: string;
          threshold?: number;
          xp_reward?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
          notified: boolean;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
          notified?: boolean;
        };
        Update: {
          notified?: boolean;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [];
      };
      activity_likes: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          activity_id: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      activity_comments: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          activity_id: string;
          user_id: string;
          content: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      search_users: {
        Args: { search_query: string };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        }[];
      };
      get_leaderboard: {
        Args: {
          time_period?: string;
          metric?: string;
          result_limit?: number;
        };
        Returns: {
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          current_level: number;
          value: number;
          rank: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailySteps = Database['public']['Tables']['daily_steps']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type ActivityWaypoint = Database['public']['Tables']['activity_waypoints']['Row'];
export type PersonalBest = Database['public']['Tables']['personal_bests']['Row'];
export type XPLedgerEntry = Database['public']['Tables']['xp_ledger']['Row'];
export type UserXP = Database['public']['Tables']['user_xp']['Row'];
export type AchievementDefinition = Database['public']['Tables']['achievement_definitions']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type Gear = Database['public']['Tables']['gear']['Row'];

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  current_level: number;
  value: number;
  rank: number;
};

export type UserSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ActivityLike = {
  id: string;
  activity_id: string;
  user_id: string;
  created_at: string;
};

export type ActivityComment = {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type AppNotification = {
  id: string;
  type: 'achievement' | 'friend_request' | 'challenge' | 'streak' | 'level_up' | 'general';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
};

export type Challenge = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  type: 'steps' | 'distance' | 'duration' | 'activities';
  target_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
};

export type ChallengeParticipant = {
  id: string;
  challenge_id: string;
  user_id: string;
  current_progress: number;
  completed: boolean;
  joined_at: string;
};
