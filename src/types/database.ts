export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Other";

export type ExpenseSource = "voice" | "receipt" | "text" | "web";

export type AccountType = "checking" | "savings";

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
          created_at: string;
        };
        Insert: {
          id: string;
          telegram_id?: number | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number | null;
          display_name?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      expense_category: ExpenseCategory;
      expense_source: ExpenseSource;
    };
    CompositeTypes: Record<string, never>;
  };
};
