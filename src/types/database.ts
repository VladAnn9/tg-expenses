export type ExpenseCategory =
  | "Food"
  | "Dining"
  | "Housing"
  | "Bills"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Health"
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
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          telegram_id: number | null;
          display_name: string | null;
          household_id: string | null;
          roast_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          telegram_id?: number | null;
          display_name?: string | null;
          household_id?: string | null;
          roast_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number | null;
          display_name?: string | null;
          household_id?: string | null;
          roast_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          balance: number;
          currency: string;
          notes: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          type?: AccountType;
          balance?: number;
          currency?: string;
          notes?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          balance?: number;
          currency?: string;
          notes?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          account_id: string;
          amount: number;
          currency: string;
          category: ExpenseCategory;
          merchant: string | null;
          note: string | null;
          source: ExpenseSource;
          transcript: string | null;
          telegram_message_id: number | null;
          expense_date: string;
          subcategory_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          amount: number;
          currency?: string;
          category?: ExpenseCategory;
          merchant?: string | null;
          note?: string | null;
          source?: ExpenseSource;
          transcript?: string | null;
          telegram_message_id?: number | null;
          expense_date?: string;
          subcategory_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          amount?: number;
          currency?: string;
          category?: ExpenseCategory;
          merchant?: string | null;
          note?: string | null;
          source?: ExpenseSource;
          transcript?: string | null;
          telegram_message_id?: number | null;
          expense_date?: string;
          subcategory_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telegram_link_requests: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: HouseholdRole;
          joined_at?: string;
        };
        Relationships: [];
      };
      household_invite_tokens: {
        Row: {
          id: string;
          household_id: string;
          created_by: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          created_by: string;
          token: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          created_by?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subcategories: {
        Row: {
          id: string;
          name: string;
          parent_category: ExpenseCategory;
          household_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_category: ExpenseCategory;
          household_id?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_category?: ExpenseCategory;
          household_id?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      merchant_aliases: {
        Row: {
          id: string;
          canonical_name: string;
          variant: string;
          household_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          canonical_name: string;
          variant: string;
          household_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          canonical_name?: string;
          variant?: string;
          household_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      income_entries: {
        Row: {
          id: string;
          account_id: string;
          amount: number;
          currency: string;
          source_label: string | null;
          note: string | null;
          income_date: string;
          created_by: string;
          telegram_message_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          amount: number;
          currency?: string;
          source_label?: string | null;
          note?: string | null;
          income_date?: string;
          created_by: string;
          telegram_message_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          amount?: number;
          currency?: string;
          source_label?: string | null;
          note?: string | null;
          income_date?: string;
          created_by?: string;
          telegram_message_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          merchant: string;
          amount: number;
          frequency: SubscriptionFrequency;
          next_expected: string;
          status: SubscriptionStatus;
          source_expense_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant: string;
          amount: number;
          frequency: SubscriptionFrequency;
          next_expected: string;
          status?: SubscriptionStatus;
          source_expense_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          merchant?: string;
          amount?: number;
          frequency?: SubscriptionFrequency;
          next_expected?: string;
          status?: SubscriptionStatus;
          source_expense_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      insights_cache: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          insights: Json;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          insights: Json;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          insights?: Json;
          generated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sum_income: {
        Args: { p_user_id: string; p_before: string };
        Returns: number;
      };
      sum_expenses: {
        Args: { p_user_id: string; p_before: string };
        Returns: number;
      };
      balance_at: {
        Args: { p_user_id: string; p_date: string };
        Returns: number;
      };
    };
    Enums: {
      expense_category: ExpenseCategory;
      expense_source: ExpenseSource;
    };
    CompositeTypes: Record<string, never>;
  };
};
