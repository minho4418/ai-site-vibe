// Supabase 스키마에 대응하는 타입. supabase/migrations/0001_init.sql 과 항상 동기화되어야 한다.
// 구조는 Supabase CLI 의 `supabase gen types typescript` 출력과 동일 → 나중에 CLI 도입 시 이 파일을
// 그 출력으로 그대로 교체하면 된다. (지금은 운영 스키마를 손으로 옮긴 버전.)
//
// 이 타입을 supabase 클라이언트(create*Server/Browser)의 제네릭으로 물려, .from()/.rpc()/.update()
// 가 컬럼·인자·반환을 컴파일 타임에 검증하게 한다(스키마-코드 드리프트를 컴파일러가 잡음).

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
      articles: {
        Row: {
          id: string;
          url: string;
          title: string;
          source: string;
          category: string;
          summary: string;
          thumbnail_url: string | null;
          published_at: string;
          likes_count: number;
          created_at: string;
          views_count: number;
          ai_summary: string | null;
          detail_summary: Json | null;
          title_key: string | null;
          keywords: string[] | null;
        };
        Insert: {
          id?: string;
          url: string;
          title: string;
          source: string;
          category: string;
          summary?: string;
          thumbnail_url?: string | null;
          published_at: string;
          likes_count?: number;
          created_at?: string;
          views_count?: number;
          ai_summary?: string | null;
          detail_summary?: Json | null;
          title_key?: string | null;
          keywords?: string[] | null;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string;
          source?: string;
          category?: string;
          summary?: string;
          thumbnail_url?: string | null;
          published_at?: string;
          likes_count?: number;
          created_at?: string;
          views_count?: number;
          ai_summary?: string | null;
          detail_summary?: Json | null;
          title_key?: string | null;
          keywords?: string[] | null;
        };
        Relationships: [];
      };
      likes: {
        Row: { device_id: string; article_id: string; created_at: string };
        Insert: { device_id: string; article_id: string; created_at?: string };
        Update: { device_id?: string; article_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "likes_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmarks: {
        Row: { device_id: string; article_id: string; created_at: string };
        Insert: { device_id: string; article_id: string; created_at?: string };
        Update: { device_id?: string; article_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_briefings: {
        Row: {
          date: string;
          payload: Json;
          created_at: string;
          updated_at: string;
          threads_post_id: string | null;
        };
        Insert: {
          date: string;
          payload: Json;
          created_at?: string;
          updated_at?: string;
          threads_post_id?: string | null;
        };
        Update: {
          date?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
          threads_post_id?: string | null;
        };
        Relationships: [];
      };
      repo_star_snapshots: {
        Row: {
          repo: string;
          snapshot_date: string;
          stars: number;
          created_at: string;
        };
        Insert: {
          repo: string;
          snapshot_date: string;
          stars: number;
          created_at?: string;
        };
        Update: {
          repo?: string;
          snapshot_date?: string;
          stars?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_likes: {
        Args: { p_article_id: string; p_device_id: string };
        Returns: number;
      };
      decrement_likes: {
        Args: { p_article_id: string; p_device_id: string };
        Returns: number;
      };
      increment_views: {
        Args: { p_article_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
