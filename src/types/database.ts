export type ExpenseCategory =
  | "Food"
  | "Dining"
  | "Housing"
  | "Bills"
  | "Transport"
  | "Travel"
  | "Sport"
  | "Shopping"
  | "Health"
  | "Entertainment"
  | "Other";

export type ExpenseSource = "voice" | "receipt" | "text" | "web" | "import";

export type AccountType = "checking" | "savings" | "cash" | "credit";

export type HouseholdRole = "owner" | "member";

export type SubscriptionFrequency = "weekly" | "monthly" | "yearly";

export type SubscriptionStatus = "suggested" | "confirmed" | "dismissed";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number;
          created_at: string;
          currency: string;
          household_id: string | null;
          id: string;
          is_primary: boolean;
          name: string;
          notes: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          currency?: string;
          household_id?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string;
          notes?: string | null;
          type?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          currency?: string;
          household_id?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string;
          notes?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          account_id: string;
          amount: number;
          category: Database["public"]["Enums"]["expense_category"];
          created_at: string;
          created_by: string;
          currency: string;
          expense_date: string;
          id: string;
          merchant: string | null;
          note: string | null;
          source: Database["public"]["Enums"]["expense_source"];
          subcategory_id: string | null;
          telegram_message_id: number | null;
          transcript: string | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          category?: Database["public"]["Enums"]["expense_category"];
          created_at?: string;
          created_by: string;
          currency?: string;
          expense_date?: string;
          id?: string;
          merchant?: string | null;
          note?: string | null;
          source?: Database["public"]["Enums"]["expense_source"];
          subcategory_id?: string | null;
          telegram_message_id?: number | null;
          transcript?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          category?: Database["public"]["Enums"]["expense_category"];
          created_at?: string;
          created_by?: string;
          currency?: string;
          expense_date?: string;
          id?: string;
          merchant?: string | null;
          note?: string | null;
          source?: Database["public"]["Enums"]["expense_source"];
          subcategory_id?: string | null;
          telegram_message_id?: number | null;
          transcript?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invite_tokens: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string;
          household_id: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "household_invite_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invite_tokens_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          household_id: string;
          id?: string;
          joined_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      income_entries: {
        Row: {
          account_id: string;
          amount: number;
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          income_date: string;
          note: string | null;
          source_label: string | null;
          telegram_message_id: number | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          created_at?: string;
          created_by: string;
          currency?: string;
          id?: string;
          income_date?: string;
          note?: string | null;
          source_label?: string | null;
          telegram_message_id?: number | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          income_date?: string;
          note?: string | null;
          source_label?: string | null;
          telegram_message_id?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "income_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "income_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      insights_cache: {
        Row: {
          generated_at: string;
          id: string;
          insights: Json;
          month: string;
          user_id: string;
        };
        Insert: {
          generated_at?: string;
          id?: string;
          insights?: Json;
          month: string;
          user_id: string;
        };
        Update: {
          generated_at?: string;
          id?: string;
          insights?: Json;
          month?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insights_cache_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_aliases: {
        Row: {
          canonical_name: string;
          created_at: string;
          household_id: string | null;
          id: string;
          variant: string;
        };
        Insert: {
          canonical_name: string;
          created_at?: string;
          household_id?: string | null;
          id?: string;
          variant: string;
        };
        Update: {
          canonical_name?: string;
          created_at?: string;
          household_id?: string | null;
          id?: string;
          variant?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_aliases_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          household_id: string | null;
          id: string;
          roast_enabled: boolean;
          telegram_id: number | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          household_id?: string | null;
          id: string;
          roast_enabled?: boolean;
          telegram_id?: number | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          household_id?: string | null;
          id?: string;
          roast_enabled?: boolean;
          telegram_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      subcategories: {
        Row: {
          created_at: string;
          created_by: string;
          household_id: string | null;
          id: string;
          name: string;
          parent_category: Database["public"]["Enums"]["expense_category"];
        };
        Insert: {
          created_at?: string;
          created_by: string;
          household_id?: string | null;
          id?: string;
          name: string;
          parent_category: Database["public"]["Enums"]["expense_category"];
        };
        Update: {
          created_at?: string;
          created_by?: string;
          household_id?: string | null;
          id?: string;
          name?: string;
          parent_category?: Database["public"]["Enums"]["expense_category"];
        };
        Relationships: [
          {
            foreignKeyName: "subcategories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcategories_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount: number;
          created_at: string;
          frequency: string;
          id: string;
          merchant: string;
          next_expected: string;
          source_expense_ids: string[];
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          frequency: string;
          id?: string;
          merchant: string;
          next_expected: string;
          source_expense_ids?: string[];
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          frequency?: string;
          id?: string;
          merchant?: string;
          next_expected?: string;
          source_expense_ids?: string[];
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_link_requests: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          token: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          token: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_link_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_pending_items: {
        Row: {
          awaiting_field: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          payload: Json;
          telegram_user_id: number;
        };
        Insert: {
          awaiting_field?: string | null;
          created_at?: string;
          expires_at?: string;
          id: string;
          payload: Json;
          telegram_user_id: number;
        };
        Update: {
          awaiting_field?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          payload?: Json;
          telegram_user_id?: number;
        };
        Relationships: [];
      };
      telegram_processed_updates: {
        Row: {
          chat_id: number | null;
          expires_at: string;
          processed_at: string;
          update_id: number;
        };
        Insert: {
          chat_id?: number | null;
          expires_at?: string;
          processed_at?: string;
          update_id: number;
        };
        Update: {
          chat_id?: number | null;
          expires_at?: string;
          processed_at?: string;
          update_id?: number;
        };
        Relationships: [];
      };
      telegram_undo_intents: {
        Row: {
          created_at: string;
          expense_id: string;
          expires_at: string;
          id: string;
          telegram_user_id: number;
        };
        Insert: {
          created_at?: string;
          expense_id: string;
          expires_at?: string;
          id: string;
          telegram_user_id: number;
        };
        Update: {
          created_at?: string;
          expense_id?: string;
          expires_at?: string;
          id?: string;
          telegram_user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_undo_intents_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      balance_at: {
        Args: { p_date: string; p_user_id: string };
        Returns: number;
      };
      get_frequent_subcategories: {
        Args: {
          p_household_id: string;
          p_limit?: number;
          p_parent_category: Database["public"]["Enums"]["expense_category"];
          p_user_id: string;
        };
        Returns: {
          expense_count: number;
          id: string;
          name: string;
        }[];
      };
      is_household_member: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      sum_expenses: {
        Args: { p_before: string; p_user_id: string };
        Returns: number;
      };
      sum_income: {
        Args: { p_before: string; p_user_id: string };
        Returns: number;
      };
    };
    Enums: {
      expense_category:
        | "Food"
        | "Transport"
        | "Shopping"
        | "Bills"
        | "Entertainment"
        | "Health"
        | "Other"
        | "Dining"
        | "Housing"
        | "Travel"
        | "Sport";
      expense_source: "voice" | "receipt" | "text" | "web" | "import";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
