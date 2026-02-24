export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_menu_detail_paths: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_production: boolean
          menu_id: string
          path_pattern: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_production?: boolean
          menu_id: string
          path_pattern: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_production?: boolean
          menu_id?: string
          path_pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_menu_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          is_production: boolean
          menu_id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          is_production?: boolean
          menu_id: string
          role_id: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          is_production?: boolean
          menu_id?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_menu_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_production: boolean
          is_system_role: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          is_system_role?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          is_system_role?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_generated_songs: {
        Row: {
          analysis_raw: Json | null
          artist: string | null
          beats_data: Json | null
          bpm: number | null
          chords: Json | null
          created_at: string
          duration: number | null
          id: string
          is_production: boolean
          lyrics: Json | null
          song_key: string | null
          time_signature: string | null
          title: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          analysis_raw?: Json | null
          artist?: string | null
          beats_data?: Json | null
          bpm?: number | null
          chords?: Json | null
          created_at?: string
          duration?: number | null
          id?: string
          is_production?: boolean
          lyrics?: Json | null
          song_key?: string | null
          time_signature?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          analysis_raw?: Json | null
          artist?: string | null
          beats_data?: Json | null
          bpm?: number | null
          chords?: Json | null
          created_at?: string
          duration?: number | null
          id?: string
          is_production?: boolean
          lyrics?: Json | null
          song_key?: string | null
          time_signature?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      arrangements: {
        Row: {
          created_at: string
          id: string
          is_production: boolean
          notes: string | null
          position: number
          repeat_count: number | null
          section_id: string
          song_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_production?: boolean
          notes?: string | null
          position: number
          repeat_count?: number | null
          section_id: string
          song_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_production?: boolean
          notes?: string | null
          position?: number
          repeat_count?: number | null
          section_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrangements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "song_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangements_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangements_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_production: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          audio_url: string | null
          category_id: string
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_production: boolean
          level: Database["public"]["Enums"]["assessment_level"]
          options: Json
          order_index: number
          points: number
          question_text: string
          question_type: string
          sub_category_id: string | null
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category_id: string
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_production?: boolean
          level: Database["public"]["Enums"]["assessment_level"]
          options?: Json
          order_index?: number
          points?: number
          question_text: string
          question_type?: string
          sub_category_id?: string | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category_id?: string
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_production?: boolean
          level?: Database["public"]["Enums"]["assessment_level"]
          options?: Json
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
          sub_category_id?: string | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "assessment_sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sub_categories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_production: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          created_at: string
          creator_name_color: string | null
          creator_name_size: number | null
          creator_name_x: number | null
          creator_name_y: number | null
          id: string
          is_default: boolean | null
          lesson_title_color: string | null
          lesson_title_size: number | null
          lesson_title_x: number | null
          lesson_title_y: number | null
          name: string
          participant_name_color: string | null
          participant_name_size: number | null
          participant_name_x: number | null
          participant_name_y: number | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          creator_name_color?: string | null
          creator_name_size?: number | null
          creator_name_x?: number | null
          creator_name_y?: number | null
          id?: string
          is_default?: boolean | null
          lesson_title_color?: string | null
          lesson_title_size?: number | null
          lesson_title_x?: number | null
          lesson_title_y?: number | null
          name: string
          participant_name_color?: string | null
          participant_name_size?: number | null
          participant_name_x?: number | null
          participant_name_y?: number | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          creator_name_color?: string | null
          creator_name_size?: number | null
          creator_name_x?: number | null
          creator_name_y?: number | null
          id?: string
          is_default?: boolean | null
          lesson_title_color?: string | null
          lesson_title_size?: number | null
          lesson_title_x?: number | null
          lesson_title_y?: number | null
          name?: string
          participant_name_color?: string | null
          participant_name_size?: number | null
          participant_name_x?: number | null
          participant_name_y?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chord_audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          created_at: string
          editor_id: string | null
          id: string
          is_production: boolean
          master_chord_id: string | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          created_at?: string
          editor_id?: string | null
          id?: string
          is_production?: boolean
          master_chord_id?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          created_at?: string
          editor_id?: string | null
          id?: string
          is_production?: boolean
          master_chord_id?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chord_audit_log_master_chord_id_fkey"
            columns: ["master_chord_id"]
            isOneToOne: false
            referencedRelation: "master_chords"
            referencedColumns: ["id"]
          },
        ]
      }
      chord_grids: {
        Row: {
          artist: string | null
          bars_per_line: number | null
          capo: number | null
          created_at: string
          id: string
          is_production: boolean
          sections: Json
          song_key: string
          tempo: number | null
          time_signature: string
          title: string
          updated_at: string
          user_id: string
          view_mode: string | null
        }
        Insert: {
          artist?: string | null
          bars_per_line?: number | null
          capo?: number | null
          created_at?: string
          id?: string
          is_production?: boolean
          sections?: Json
          song_key?: string
          tempo?: number | null
          time_signature?: string
          title: string
          updated_at?: string
          user_id: string
          view_mode?: string | null
        }
        Update: {
          artist?: string | null
          bars_per_line?: number | null
          capo?: number | null
          created_at?: string
          id?: string
          is_production?: boolean
          sections?: Json
          song_key?: string
          tempo?: number | null
          time_signature?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_mode?: string | null
        }
        Relationships: []
      }
      chord_review_queue: {
        Row: {
          ai_confidence: number | null
          chord_name: string
          created_at: string
          id: string
          is_production: boolean
          mapped_by: string | null
          mapped_to_master_id: string | null
          occurrence_count: number | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          root_note: string | null
          sample_song_ids: string[] | null
          song_id: string | null
          status: string | null
          suggested_guitar_voicing: Json | null
          suggested_piano_voicing: Json | null
          suggested_quality: string | null
          suggested_root_note: string | null
          user_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          chord_name: string
          created_at?: string
          id?: string
          is_production?: boolean
          mapped_by?: string | null
          mapped_to_master_id?: string | null
          occurrence_count?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_note?: string | null
          sample_song_ids?: string[] | null
          song_id?: string | null
          status?: string | null
          suggested_guitar_voicing?: Json | null
          suggested_piano_voicing?: Json | null
          suggested_quality?: string | null
          suggested_root_note?: string | null
          user_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          chord_name?: string
          created_at?: string
          id?: string
          is_production?: boolean
          mapped_by?: string | null
          mapped_to_master_id?: string | null
          occurrence_count?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_note?: string | null
          sample_song_ids?: string[] | null
          song_id?: string | null
          status?: string | null
          suggested_guitar_voicing?: Json | null
          suggested_piano_voicing?: Json | null
          suggested_quality?: string | null
          suggested_root_note?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chord_review_queue_mapped_to_master_id_fkey"
            columns: ["mapped_to_master_id"]
            isOneToOne: false
            referencedRelation: "master_chords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chord_review_queue_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chord_review_queue_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      chord_variations: {
        Row: {
          created_at: string
          created_by: string | null
          guitar_chord_shape: string | null
          guitar_difficulty: number | null
          guitar_fingering: number[] | null
          id: string
          is_production: boolean
          master_chord_id: string
          notes: string | null
          piano_fingering: string | null
          piano_hand: string | null
          piano_notes: string[] | null
          variation_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          guitar_chord_shape?: string | null
          guitar_difficulty?: number | null
          guitar_fingering?: number[] | null
          id?: string
          is_production?: boolean
          master_chord_id: string
          notes?: string | null
          piano_fingering?: string | null
          piano_hand?: string | null
          piano_notes?: string[] | null
          variation_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          guitar_chord_shape?: string | null
          guitar_difficulty?: number | null
          guitar_fingering?: number[] | null
          id?: string
          is_production?: boolean
          master_chord_id?: string
          notes?: string | null
          piano_fingering?: string | null
          piano_hand?: string | null
          piano_notes?: string[] | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chord_variations_master_chord_id_fkey"
            columns: ["master_chord_id"]
            isOneToOne: false
            referencedRelation: "master_chords"
            referencedColumns: ["id"]
          },
        ]
      }
      chord_versions: {
        Row: {
          changes_diff: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_production: boolean | null
          master_chord_id: string
          revert_reason: string | null
          version_number: number
        }
        Insert: {
          changes_diff: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_production?: boolean | null
          master_chord_id: string
          revert_reason?: string | null
          version_number: number
        }
        Update: {
          changes_diff?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_production?: boolean | null
          master_chord_id?: string
          revert_reason?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "chord_versions_master_chord_id_fkey"
            columns: ["master_chord_id"]
            isOneToOne: false
            referencedRelation: "master_chords"
            referencedColumns: ["id"]
          },
        ]
      }
      chords: {
        Row: {
          chord: string
          confidence: number | null
          created_at: string
          detection_method: string | null
          id: string
          is_production: boolean
          timestamp: number
          updated_at: string
          video_id: string
        }
        Insert: {
          chord: string
          confidence?: number | null
          created_at?: string
          detection_method?: string | null
          id?: string
          is_production?: boolean
          timestamp: number
          updated_at?: string
          video_id: string
        }
        Update: {
          chord?: string
          confidence?: number | null
          created_at?: string
          detection_method?: string | null
          id?: string
          is_production?: boolean
          timestamp?: number
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      content_access_logs: {
        Row: {
          access_type: string
          content_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          is_production: boolean
          lesson_id: string
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          content_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_production?: boolean
          lesson_id: string
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          content_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_production?: boolean
          lesson_id?: string
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_access_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_access_logs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_access_logs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      content_validation_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_production: boolean | null
          publication_id: string | null
          result: Json | null
          song_id: string | null
          status: string | null
          validation_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_production?: boolean | null
          publication_id?: string | null
          result?: Json | null
          song_id?: string | null
          status?: string | null
          validation_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_production?: boolean | null
          publication_id?: string | null
          result?: Json | null
          song_id?: string | null
          status?: string | null
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_validation_queue_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "creator_pro_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_validation_queue_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_validation_queue_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          is_escalated: boolean
          is_production: boolean
          language: string | null
          status: string
          telegram_topic_id: number | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_escalated?: boolean
          is_production?: boolean
          language?: string | null
          status?: string
          telegram_topic_id?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_escalated?: boolean
          is_production?: boolean
          language?: string | null
          status?: string
          telegram_topic_id?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creator_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          experience_years: number | null
          full_name: string
          id: string
          instruments: string[] | null
          motivation: string
          musical_background: string
          reviewed_at: string | null
          reviewed_by: string | null
          sample_work_url: string | null
          sample_work_url_1: string | null
          sample_work_url_2: string | null
          sample_work_url_3: string | null
          social_links: Json | null
          specialties: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          experience_years?: number | null
          full_name: string
          id?: string
          instruments?: string[] | null
          motivation: string
          musical_background: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work_url?: string | null
          sample_work_url_1?: string | null
          sample_work_url_2?: string | null
          sample_work_url_3?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          instruments?: string[] | null
          motivation?: string
          musical_background?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work_url?: string | null
          sample_work_url_1?: string | null
          sample_work_url_2?: string | null
          sample_work_url_3?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_benefit_configs: {
        Row: {
          benefit_discount_code: number
          benefit_lesson_percentage: number
          benefit_per_library_add: number
          benefit_per_song_publish: number
          benefit_sequencer_percentage: number
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          is_production: boolean
          period_end_date: string | null
          period_start_date: string | null
          updated_at: string
        }
        Insert: {
          benefit_discount_code?: number
          benefit_lesson_percentage?: number
          benefit_per_library_add?: number
          benefit_per_song_publish?: number
          benefit_sequencer_percentage?: number
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          period_end_date?: string | null
          period_start_date?: string | null
          updated_at?: string
        }
        Update: {
          benefit_discount_code?: number
          benefit_lesson_percentage?: number
          benefit_per_library_add?: number
          benefit_per_song_publish?: number
          benefit_sequencer_percentage?: number
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          period_end_date?: string | null
          period_start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_benefits: {
        Row: {
          added_by_user_id: string | null
          amount: number
          benefit_type: string
          created_at: string
          creator_id: string
          id: string
          is_production: boolean
          song_id: string | null
          updated_at: string
        }
        Insert: {
          added_by_user_id?: string | null
          amount?: number
          benefit_type: string
          created_at?: string
          creator_id: string
          id?: string
          is_production?: boolean
          song_id?: string | null
          updated_at?: string
        }
        Update: {
          added_by_user_id?: string | null
          amount?: number
          benefit_type?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_production?: boolean
          song_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_discount_benefits: {
        Row: {
          admin_benefit_amount: number
          created_at: string
          creator_benefit_amount: number
          creator_id: string
          discount_amount: number
          discount_code_id: string
          id: string
          is_production: boolean
          original_amount: number
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          admin_benefit_amount: number
          created_at?: string
          creator_benefit_amount: number
          creator_id: string
          discount_amount: number
          discount_code_id: string
          id?: string
          is_production?: boolean
          original_amount: number
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          admin_benefit_amount?: number
          created_at?: string
          creator_benefit_amount?: number
          creator_id?: string
          discount_amount?: number
          discount_code_id?: string
          id?: string
          is_production?: boolean
          original_amount?: number
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_discount_benefits_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creator_discount_benefits_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_discount_benefits_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_discount_benefits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_pro_publications: {
        Row: {
          created_at: string | null
          id: string
          is_production: boolean | null
          published_at: string | null
          rejected_reason: string | null
          review_notes: string | null
          song_id: string
          status: string | null
          updated_at: string | null
          user_id: string
          validation_results: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          published_at?: string | null
          rejected_reason?: string | null
          review_notes?: string | null
          song_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          validation_results?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          published_at?: string | null
          rejected_reason?: string | null
          review_notes?: string | null
          song_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_pro_publications_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: true
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_pro_publications_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: true
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_pro_score_config: {
        Row: {
          config_key: string
          config_value: number
          description: string | null
          id: string
          is_production: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: number
          description?: string | null
          id?: string
          is_production?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: number
          description?: string | null
          id?: string
          is_production?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_pro_scores: {
        Row: {
          approved_publications: number | null
          average_rating: number | null
          blocked_until: string | null
          community_score: number | null
          confirmed_reports: number | null
          created_at: string | null
          id: string
          is_production: boolean | null
          last_warning_at: string | null
          rejected_publications: number | null
          status: string | null
          suspension_reason: string | null
          total_publications: number | null
          total_ratings: number | null
          total_reports: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string
          validation_score: number | null
          warning_count: number | null
        }
        Insert: {
          approved_publications?: number | null
          average_rating?: number | null
          blocked_until?: string | null
          community_score?: number | null
          confirmed_reports?: number | null
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          last_warning_at?: string | null
          rejected_publications?: number | null
          status?: string | null
          suspension_reason?: string | null
          total_publications?: number | null
          total_ratings?: number | null
          total_reports?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
          validation_score?: number | null
          warning_count?: number | null
        }
        Update: {
          approved_publications?: number | null
          average_rating?: number | null
          blocked_until?: string | null
          community_score?: number | null
          confirmed_reports?: number | null
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          last_warning_at?: string | null
          rejected_publications?: number | null
          status?: string | null
          suspension_reason?: string | null
          total_publications?: number | null
          total_ratings?: number | null
          total_reports?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
          validation_score?: number | null
          warning_count?: number | null
        }
        Relationships: []
      }
      creator_score_history: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          is_production: boolean | null
          score_after: number | null
          score_before: number | null
          score_delta: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          is_production?: boolean | null
          score_after?: number | null
          score_before?: number | null
          score_delta?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          is_production?: boolean | null
          score_after?: number | null
          score_before?: number | null
          score_delta?: number | null
          user_id?: string
        }
        Relationships: []
      }
      creator_tier_config: {
        Row: {
          config_key: string
          config_value: string | null
          created_at: string
          description: string | null
          id: string
          is_production: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_production?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_production?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      creator_tiers: {
        Row: {
          benefit_per_add: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_production: boolean
          max_library_adds: number | null
          min_library_adds: number
          tier_icon: string | null
          tier_name: string
          updated_at: string
        }
        Insert: {
          benefit_per_add?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_production?: boolean
          max_library_adds?: number | null
          min_library_adds?: number
          tier_icon?: string | null
          tier_name: string
          updated_at?: string
        }
        Update: {
          benefit_per_add?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_production?: boolean
          max_library_adds?: number | null
          min_library_adds?: number
          tier_icon?: string | null
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          creator_id: string
          fee: number
          id: string
          is_production: boolean
          method: string
          net_amount: number
          payment_details: Json
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          creator_id: string
          fee?: number
          id?: string
          is_production?: boolean
          method: string
          net_amount: number
          payment_details: Json
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          creator_id?: string
          fee?: number
          id?: string
          is_production?: boolean
          method?: string
          net_amount?: number
          payment_details?: Json
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_withdrawal_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          id: number
          log_time: string | null
          message: string | null
        }
        Insert: {
          id?: number
          log_time?: string | null
          message?: string | null
        }
        Update: {
          id?: number
          log_time?: string | null
          message?: string | null
        }
        Relationships: []
      }
      discount_code_assignments: {
        Row: {
          created_at: string
          creator_id: string
          discount_code_id: string
          id: string
          is_production: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          discount_code_id: string
          id?: string
          is_production?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          discount_code_id?: string
          id?: string
          is_production?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_assignments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_code_assignments_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          billing_cycle: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          is_new_customer: boolean
          is_production: boolean | null
          max_uses: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          billing_cycle?: string | null
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          is_new_customer?: boolean
          is_production?: boolean | null
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          billing_cycle?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          is_new_customer?: boolean
          is_production?: boolean | null
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          attached_image_url: string | null
          blast_unique_id: string | null
          body: string
          created_at: string | null
          error_message: string | null
          id: string
          is_production: boolean | null
          link_text: string | null
          link_url: string | null
          recipient_email: string
          recipient_name: string
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          attached_image_url?: string | null
          blast_unique_id?: string | null
          body: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_production?: boolean | null
          link_text?: string | null
          link_url?: string | null
          recipient_email: string
          recipient_name: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          attached_image_url?: string | null
          blast_unique_id?: string | null
          body?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_production?: boolean | null
          link_text?: string | null
          link_url?: string | null
          recipient_email?: string
          recipient_name?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          ip_address: unknown
          operation_type: string
          stack_trace: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          ip_address?: unknown
          operation_type: string
          stack_trace?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          ip_address?: unknown
          operation_type?: string
          stack_trace?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_attendee_profiles: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string | null
          id: string
          interests: string[] | null
          is_production: boolean
          job_title: string | null
          linkedin_url: string | null
          looking_for: string[] | null
          registration_id: string
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          is_production?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          registration_id: string
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          is_production?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          registration_id?: string
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendee_profiles_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_certificates: {
        Row: {
          certificate_url: string
          event_id: string
          generated_at: string | null
          id: string
          is_production: boolean
          registration_id: string
          serial_number: string
        }
        Insert: {
          certificate_url: string
          event_id: string
          generated_at?: string | null
          id?: string
          is_production?: boolean
          registration_id: string
          serial_number: string
        }
        Update: {
          certificate_url?: string
          event_id?: string
          generated_at?: string | null
          id?: string
          is_production?: boolean
          registration_id?: string
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_community_posts: {
        Row: {
          content: string
          created_at: string | null
          event_id: string
          id: string
          is_announcement: boolean | null
          is_production: boolean
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          is_announcement?: boolean | null
          is_production?: boolean
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_announcement?: boolean | null
          is_production?: boolean
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_community_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_media: {
        Row: {
          caption: string | null
          event_id: string
          id: string
          is_production: boolean
          media_type: string
          media_url: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          event_id: string
          id?: string
          is_production?: boolean
          media_type: string
          media_url: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          event_id?: string
          id?: string
          is_production?: boolean
          media_type?: string
          media_url?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_networking_connections: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_production: boolean
          message: string | null
          receiver_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_production?: boolean
          message?: string | null
          receiver_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_production?: boolean
          message?: string | null
          receiver_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_networking_connections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          discount_code_id: string | null
          event_id: string
          expires_at: string
          id: string
          is_production: boolean | null
          metadata: Json | null
          midtrans_order_id: string | null
          midtrans_transaction_id: string | null
          original_amount: number | null
          paid_at: string | null
          payment_method: string | null
          snap_redirect_url: string | null
          snap_token: string | null
          status: string
          ticket_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          discount_code_id?: string | null
          event_id: string
          expires_at: string
          id?: string
          is_production?: boolean | null
          metadata?: Json | null
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          original_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          ticket_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          discount_code_id?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          is_production?: boolean | null
          metadata?: Json | null
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          original_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          ticket_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_promotional_news: {
        Row: {
          created_at: string
          event_id: string
          id: string
          image_url: string
          is_active: boolean
          is_production: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          image_url: string
          is_active?: boolean
          is_production?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string
          is_active?: boolean
          is_production?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_promotional_news_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_quota_transaction_history: {
        Row: {
          created_at: string | null
          id: string
          is_production: boolean
          notes: string | null
          payment_id: string | null
          ticket_category_id: string
          ticket_count: number
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_production?: boolean
          notes?: string | null
          payment_id?: string | null
          ticket_category_id: string
          ticket_count: number
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_production?: boolean
          notes?: string | null
          payment_id?: string | null
          ticket_category_id?: string
          ticket_count?: number
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_quota_transaction_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_quota_transaction_history_ticket_category_id_fkey"
            columns: ["ticket_category_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          amount_paid: number | null
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          booking_id: string
          certificate_generated_at: string | null
          certificate_url: string | null
          check_in_time: string | null
          created_at: string
          event_id: string
          id: string
          is_production: boolean
          is_vip: boolean
          payment_status: string | null
          qr_code: string
          registration_date: string
          show_in_attendee_list: boolean | null
          status: string | null
          survey_completed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          booking_id: string
          certificate_generated_at?: string | null
          certificate_url?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_production?: boolean
          is_vip?: boolean
          payment_status?: string | null
          qr_code: string
          registration_date?: string
          show_in_attendee_list?: boolean | null
          status?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          booking_id?: string
          certificate_generated_at?: string | null
          certificate_url?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_production?: boolean
          is_vip?: boolean
          payment_status?: string | null
          qr_code?: string
          registration_date?: string
          show_in_attendee_list?: boolean | null
          status?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_registrations_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          is_production: boolean | null
          order_index: number
          quota: number
          remaining_quota: number
          session_end_date: string
          session_name: string
          session_start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          order_index?: number
          quota: number
          remaining_quota: number
          session_end_date: string
          session_name: string
          session_start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          order_index?: number
          quota?: number
          remaining_quota?: number
          session_end_date?: string
          session_name?: string
          session_start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_survey_responses: {
        Row: {
          id: string
          is_production: boolean
          registration_id: string
          responses: Json
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          id?: string
          is_production?: boolean
          registration_id: string
          responses: Json
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          id?: string
          is_production?: boolean
          registration_id?: string
          responses?: Json
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_survey_responses_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "event_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      event_surveys: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_production: boolean
          questions: Json
          send_after_hours: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_production?: boolean
          questions?: Json
          send_after_hours?: number | null
          title?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_production?: boolean
          questions?: Json
          send_after_hours?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_production: boolean
          max_purchase: number | null
          min_purchase: number | null
          name: string
          order_index: number
          price: number
          quota: number | null
          remaining_quota: number | null
          sale_end_date: string | null
          sale_start_date: string | null
          ticket_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          max_purchase?: number | null
          min_purchase?: number | null
          name: string
          order_index?: number
          price?: number
          quota?: number | null
          remaining_quota?: number | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          ticket_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          max_purchase?: number | null
          min_purchase?: number | null
          name?: string
          order_index?: number
          price?: number
          quota?: number | null
          remaining_quota?: number | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          ticket_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_categories_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_change_requests: {
        Row: {
          change_type: string
          created_at: string | null
          id: string
          is_production: boolean | null
          new_value: string
          old_value: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          new_value: string
          old_value: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          new_value?: string
          old_value?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_change_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "event_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_production: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          buyer_user_id: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string | null
          event_id: string
          id: string
          is_production: boolean | null
          participant_email: string
          participant_ktp: string | null
          participant_name: string
          participant_phone: string
          payment_id: string | null
          qr_code_data: string | null
          registration_id: string | null
          session_id: string | null
          status: string
          ticket_category_id: string | null
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          buyer_user_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_production?: boolean | null
          participant_email: string
          participant_ktp?: string | null
          participant_name: string
          participant_phone: string
          payment_id?: string | null
          qr_code_data?: string | null
          registration_id?: string | null
          session_id?: string | null
          status?: string
          ticket_category_id?: string | null
          ticket_number: string
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_production?: boolean | null
          participant_email?: string
          participant_ktp?: string | null
          participant_name?: string
          participant_phone?: string
          payment_id?: string | null
          qr_code_data?: string | null
          registration_id?: string | null
          session_id?: string | null
          status?: string
          ticket_category_id?: string | null
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_ticket_category_id_fkey"
            columns: ["ticket_category_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ushers: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          event_id: string
          id: string
          is_production: boolean
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id: string
          id?: string
          is_production?: boolean
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id?: string
          id?: string
          is_production?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ushers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          admin_fee_amount: number | null
          admin_fee_enabled: boolean | null
          admin_fee_paid_by_customer: boolean | null
          allow_cancellation: boolean | null
          allow_multiple_tickets: boolean | null
          banner_image_url: string | null
          cancellation_deadline: string | null
          created_at: string
          current_registrations: number | null
          custom_event_url: string | null
          date: string
          description: string | null
          enable_max_purchase: boolean | null
          end_time: string | null
          event_qr_code: string | null
          google_maps_link: string | null
          id: string
          is_production: boolean
          location: string
          max_capacity: number | null
          max_purchase: number | null
          max_tickets_per_purchase: number | null
          notes: string | null
          organizer_email: string | null
          organizer_icon: string | null
          organizer_id: string | null
          organizer_name: string
          organizer_phone: string | null
          payment_expiry_minutes: number | null
          platform_fee_amount: number | null
          platform_fee_enabled: boolean | null
          platform_fee_paid_by_customer: boolean | null
          price: number | null
          registration_deadline: string | null
          setlist_id: string | null
          show_spots_left: boolean | null
          slug: string | null
          speaker_bio: string | null
          speaker_image_url: string | null
          speaker_name: string | null
          stage_seating_image_url: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string
          use_core_api: boolean | null
          use_sessions: boolean | null
          vat_tax_enabled: boolean | null
          vat_tax_paid_by_customer: boolean | null
          vat_tax_percentage: number | null
          visibility: string | null
        }
        Insert: {
          address?: string | null
          admin_fee_amount?: number | null
          admin_fee_enabled?: boolean | null
          admin_fee_paid_by_customer?: boolean | null
          allow_cancellation?: boolean | null
          allow_multiple_tickets?: boolean | null
          banner_image_url?: string | null
          cancellation_deadline?: string | null
          created_at?: string
          current_registrations?: number | null
          custom_event_url?: string | null
          date: string
          description?: string | null
          enable_max_purchase?: boolean | null
          end_time?: string | null
          event_qr_code?: string | null
          google_maps_link?: string | null
          id?: string
          is_production?: boolean
          location: string
          max_capacity?: number | null
          max_purchase?: number | null
          max_tickets_per_purchase?: number | null
          notes?: string | null
          organizer_email?: string | null
          organizer_icon?: string | null
          organizer_id?: string | null
          organizer_name: string
          organizer_phone?: string | null
          payment_expiry_minutes?: number | null
          platform_fee_amount?: number | null
          platform_fee_enabled?: boolean | null
          platform_fee_paid_by_customer?: boolean | null
          price?: number | null
          registration_deadline?: string | null
          setlist_id?: string | null
          show_spots_left?: boolean | null
          slug?: string | null
          speaker_bio?: string | null
          speaker_image_url?: string | null
          speaker_name?: string | null
          stage_seating_image_url?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string
          use_core_api?: boolean | null
          use_sessions?: boolean | null
          vat_tax_enabled?: boolean | null
          vat_tax_paid_by_customer?: boolean | null
          vat_tax_percentage?: number | null
          visibility?: string | null
        }
        Update: {
          address?: string | null
          admin_fee_amount?: number | null
          admin_fee_enabled?: boolean | null
          admin_fee_paid_by_customer?: boolean | null
          allow_cancellation?: boolean | null
          allow_multiple_tickets?: boolean | null
          banner_image_url?: string | null
          cancellation_deadline?: string | null
          created_at?: string
          current_registrations?: number | null
          custom_event_url?: string | null
          date?: string
          description?: string | null
          enable_max_purchase?: boolean | null
          end_time?: string | null
          event_qr_code?: string | null
          google_maps_link?: string | null
          id?: string
          is_production?: boolean
          location?: string
          max_capacity?: number | null
          max_purchase?: number | null
          max_tickets_per_purchase?: number | null
          notes?: string | null
          organizer_email?: string | null
          organizer_icon?: string | null
          organizer_id?: string | null
          organizer_name?: string
          organizer_phone?: string | null
          payment_expiry_minutes?: number | null
          platform_fee_amount?: number | null
          platform_fee_enabled?: boolean | null
          platform_fee_paid_by_customer?: boolean | null
          price?: number | null
          registration_deadline?: string | null
          setlist_id?: string | null
          show_spots_left?: boolean | null
          slug?: string | null
          speaker_bio?: string | null
          speaker_image_url?: string | null
          speaker_name?: string | null
          stage_seating_image_url?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string
          use_core_api?: boolean | null
          use_sessions?: boolean | null
          vat_tax_enabled?: boolean | null
          vat_tax_paid_by_customer?: boolean | null
          vat_tax_percentage?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_completions: {
        Row: {
          attempt_data: Json | null
          completed_at: string | null
          exercise_id: string
          id: string
          score: number | null
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          attempt_data?: Json | null
          completed_at?: string | null
          exercise_id: string
          id?: string
          score?: number | null
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          attempt_data?: Json | null
          completed_at?: string | null
          exercise_id?: string
          id?: string
          score?: number | null
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "interactive_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_lessons: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_production: boolean
          lesson_id: string
          section_key: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_production?: boolean
          lesson_id: string
          section_key: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_production?: boolean
          lesson_id?: string
          section_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_exercise: {
        Row: {
          created_at: string
          description: string | null
          enable_camera_recording: boolean
          exercise_type: string
          id: string
          is_production: boolean
          lesson_id: string
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enable_camera_recording?: boolean
          exercise_type: string
          id?: string
          is_production?: boolean
          lesson_id: string
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enable_camera_recording?: boolean
          exercise_type?: string
          id?: string
          is_production?: boolean
          lesson_id?: string
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_exercise_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_exercise_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_exercises: {
        Row: {
          completion_criteria: Json | null
          content_id: string
          created_at: string | null
          difficulty: number | null
          exercise_data: Json
          exercise_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          completion_criteria?: Json | null
          content_id: string
          created_at?: string | null
          difficulty?: number | null
          exercise_data: Json
          exercise_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          completion_criteria?: Json | null
          content_id?: string
          created_at?: string | null
          difficulty?: number | null
          exercise_data?: Json
          exercise_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactive_exercises_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_certificates: {
        Row: {
          certificate_url: string | null
          created_at: string
          enrollment_id: string
          generated_at: string | null
          id: string
          lesson_id: string
          serial_number: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          enrollment_id: string
          generated_at?: string | null
          id?: string
          lesson_id: string
          serial_number?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          enrollment_id?: string
          generated_at?: string | null
          id?: string
          lesson_id?: string
          serial_number?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "lesson_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_certificates_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_certificates_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_content: {
        Row: {
          content_data: Json | null
          content_type: Database["public"]["Enums"]["content_type"]
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          enable_camera_recording: boolean | null
          id: string
          is_preview: boolean | null
          module_id: string
          order_index: number
          resource_url: string | null
          song_id: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content_data?: Json | null
          content_type: Database["public"]["Enums"]["content_type"]
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          enable_camera_recording?: boolean | null
          id?: string
          is_preview?: boolean | null
          module_id: string
          order_index: number
          resource_url?: string | null
          song_id?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content_data?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"]
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          enable_camera_recording?: boolean | null
          id?: string
          is_preview?: boolean | null
          module_id?: string
          order_index?: number
          resource_url?: string | null
          song_id?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lesson_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_content_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_content_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_enrollments: {
        Row: {
          access_expires_at: string | null
          completed_at: string | null
          enrolled_at: string | null
          id: string
          is_production: boolean
          last_accessed_at: string | null
          lesson_id: string
          payment_id: string | null
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_production?: boolean
          last_accessed_at?: string | null
          lesson_id: string
          payment_id?: string | null
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_production?: boolean
          last_accessed_at?: string | null
          lesson_id?: string
          payment_id?: string | null
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_enrollments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_enrollments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_enrollments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_modules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_locked: boolean | null
          lesson_id: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          lesson_id: string
          order_index: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          lesson_id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_modules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_modules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_performance_recordings: {
        Row: {
          content_id: string
          created_at: string | null
          creator_notes: string | null
          duration_seconds: number | null
          id: string
          is_production: boolean | null
          lesson_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          video_url: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          creator_notes?: string | null
          duration_seconds?: number | null
          id?: string
          is_production?: boolean | null
          lesson_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          video_url: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          creator_notes?: string | null
          duration_seconds?: number | null
          id?: string
          is_production?: boolean | null
          lesson_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_performance_recordings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_performance_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_performance_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completion_date: string | null
          content_id: string
          created_at: string | null
          enrollment_id: string
          id: string
          notes: string | null
          quiz_answers: Json | null
          quiz_score: number | null
          quiz_total_questions: number | null
          time_spent_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completion_date?: string | null
          content_id: string
          created_at?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          quiz_answers?: Json | null
          quiz_score?: number | null
          quiz_total_questions?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completion_date?: string | null
          content_id?: string
          created_at?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          quiz_answers?: Json | null
          quiz_score?: number | null
          quiz_total_questions?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "lesson_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reviews: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_section_settings: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_production: boolean
          is_visible: boolean
          section_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_production?: boolean
          is_visible?: boolean
          section_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_production?: boolean
          is_visible?: boolean
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          is_production: boolean
          lesson_id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          lesson_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          lesson_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whitelist_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_whitelist_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          average_rating: number | null
          category: Database["public"]["Enums"]["lesson_category"]
          cover_image_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["lesson_difficulty"]
          download_prevention: boolean
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          is_production: boolean
          is_unlisted: boolean
          learning_outcomes: string[] | null
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          max_concurrent_sessions: number | null
          original_price: number | null
          price: number | null
          published_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["lesson_status"] | null
          subcategory: string | null
          title: string
          total_enrollments: number | null
          updated_at: string | null
          watermark_enabled: boolean
        }
        Insert: {
          average_rating?: number | null
          category: Database["public"]["Enums"]["lesson_category"]
          cover_image_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty_level: Database["public"]["Enums"]["lesson_difficulty"]
          download_prevention?: boolean
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          is_production?: boolean
          is_unlisted?: boolean
          learning_outcomes?: string[] | null
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          max_concurrent_sessions?: number | null
          original_price?: number | null
          price?: number | null
          published_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          subcategory?: string | null
          title: string
          total_enrollments?: number | null
          updated_at?: string | null
          watermark_enabled?: boolean
        }
        Update: {
          average_rating?: number | null
          category?: Database["public"]["Enums"]["lesson_category"]
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["lesson_difficulty"]
          download_prevention?: boolean
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          is_production?: boolean
          is_unlisted?: boolean
          learning_outcomes?: string[] | null
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          max_concurrent_sessions?: number | null
          original_price?: number | null
          price?: number | null
          published_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          subcategory?: string | null
          title?: string
          total_enrollments?: number | null
          updated_at?: string | null
          watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lessons_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      library_fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string
          creator_id: string
          details: Json | null
          id: string
          is_production: boolean
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          song_count: number
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          creator_id: string
          details?: Json | null
          id?: string
          is_production?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          song_count?: number
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          creator_id?: string
          details?: Json | null
          id?: string
          is_production?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          song_count?: number
          user_id?: string
        }
        Relationships: []
      }
      linked_payment_accounts: {
        Row: {
          account_details: Json | null
          account_id: string
          created_at: string
          id: string
          is_production: boolean
          last_charge_at: string | null
          linked_at: string | null
          masked_number: string | null
          next_charge_at: string | null
          payment_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: Json | null
          account_id: string
          created_at?: string
          id?: string
          is_production?: boolean
          last_charge_at?: string | null
          linked_at?: string | null
          masked_number?: string | null
          next_charge_at?: string | null
          payment_method: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: Json | null
          account_id?: string
          created_at?: string
          id?: string
          is_production?: boolean
          last_charge_at?: string | null
          linked_at?: string | null
          masked_number?: string | null
          next_charge_at?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lottery_winners: {
        Row: {
          attendee_name: string
          created_at: string
          event_id: string
          id: string
          is_production: boolean
          reward_name: string
          reward_type: string
          subscription_plan: string | null
          user_id: string
          won_at: string
        }
        Insert: {
          attendee_name: string
          created_at?: string
          event_id: string
          id?: string
          is_production?: boolean
          reward_name: string
          reward_type: string
          subscription_plan?: string | null
          user_id: string
          won_at?: string
        }
        Update: {
          attendee_name?: string
          created_at?: string
          event_id?: string
          id?: string
          is_production?: boolean
          reward_name?: string
          reward_type?: string
          subscription_plan?: string | null
          user_id?: string
          won_at?: string
        }
        Relationships: []
      }
      master_chords: {
        Row: {
          bass_note: string | null
          chord_name: string
          created_at: string
          created_by: string | null
          enharmonics: string[] | null
          formula: string | null
          guitar_chord_shape: string | null
          guitar_difficulty: number | null
          guitar_fingering: string[] | null
          id: string
          instrument: Database["public"]["Enums"]["instrument_type"]
          is_production: boolean
          notes: string | null
          parent_version_id: string | null
          piano_fingering: string | null
          piano_hand: string | null
          piano_notes: string[] | null
          quality: Database["public"]["Enums"]["chord_quality"]
          root_note: string
          status: Database["public"]["Enums"]["chord_status"]
          updated_at: string
          updated_by: string | null
          usage_count: number | null
          version_number: number | null
        }
        Insert: {
          bass_note?: string | null
          chord_name: string
          created_at?: string
          created_by?: string | null
          enharmonics?: string[] | null
          formula?: string | null
          guitar_chord_shape?: string | null
          guitar_difficulty?: number | null
          guitar_fingering?: string[] | null
          id?: string
          instrument: Database["public"]["Enums"]["instrument_type"]
          is_production?: boolean
          notes?: string | null
          parent_version_id?: string | null
          piano_fingering?: string | null
          piano_hand?: string | null
          piano_notes?: string[] | null
          quality: Database["public"]["Enums"]["chord_quality"]
          root_note: string
          status?: Database["public"]["Enums"]["chord_status"]
          updated_at?: string
          updated_by?: string | null
          usage_count?: number | null
          version_number?: number | null
        }
        Update: {
          bass_note?: string | null
          chord_name?: string
          created_at?: string
          created_by?: string | null
          enharmonics?: string[] | null
          formula?: string | null
          guitar_chord_shape?: string | null
          guitar_difficulty?: number | null
          guitar_fingering?: string[] | null
          id?: string
          instrument?: Database["public"]["Enums"]["instrument_type"]
          is_production?: boolean
          notes?: string | null
          parent_version_id?: string | null
          piano_fingering?: string | null
          piano_hand?: string | null
          piano_notes?: string[] | null
          quality?: Database["public"]["Enums"]["chord_quality"]
          root_note?: string
          status?: Database["public"]["Enums"]["chord_status"]
          updated_at?: string
          updated_by?: string | null
          usage_count?: number | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_chords_created_by_fkey1"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "master_chords_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "master_chords"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_predefined: boolean
          is_production: boolean
          message_type: string
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_predefined?: boolean
          is_production?: boolean
          message_type?: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_predefined?: boolean
          is_production?: boolean
          message_type?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mixer_presets: {
        Row: {
          click_enabled: boolean | null
          click_start_offset: number | null
          click_subdivision: string | null
          click_tempo: number | null
          click_volume: number | null
          created_at: string
          cue_enabled: boolean | null
          cue_voice: string | null
          cue_volume: number | null
          id: string
          is_active: boolean | null
          is_production: boolean
          master_volume: number
          name: string
          sequencer_file_id: string
          tracks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          click_enabled?: boolean | null
          click_start_offset?: number | null
          click_subdivision?: string | null
          click_tempo?: number | null
          click_volume?: number | null
          created_at?: string
          cue_enabled?: boolean | null
          cue_voice?: string | null
          cue_volume?: number | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean
          master_volume?: number
          name: string
          sequencer_file_id: string
          tracks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          click_enabled?: boolean | null
          click_start_offset?: number | null
          click_subdivision?: string | null
          click_tempo?: number | null
          click_volume?: number | null
          created_at?: string
          cue_enabled?: boolean | null
          cue_voice?: string | null
          cue_volume?: number | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean
          master_volume?: number
          name?: string
          sequencer_file_id?: string
          tracks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mixer_presets_sequencer_file_id_fkey"
            columns: ["sequencer_file_id"]
            isOneToOne: false
            referencedRelation: "sequencer_files"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          is_production: boolean
          is_verified: boolean
          otp_code: string
          user_data: Json
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_production?: boolean
          is_verified?: boolean
          otp_code: string
          user_data: Json
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_production?: boolean
          is_verified?: boolean
          otp_code?: string
          user_data?: Json
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          is_production: boolean
          is_used: boolean
          token: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          is_production?: boolean
          is_used?: boolean
          token: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_production?: boolean
          is_used?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          actions: Json | null
          amount: number
          bill_key: string | null
          biller_code: string | null
          created_at: string
          currency: string | null
          deeplink_url: string | null
          discount_code_id: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          is_production: boolean | null
          lesson_id: string | null
          metadata: Json | null
          midtrans_order_id: string | null
          midtrans_transaction_id: string | null
          original_amount: number | null
          paid_at: string | null
          payment_code: string | null
          payment_method: string | null
          payment_type: string | null
          qr_code_url: string | null
          sequencer_id: string | null
          snap_redirect_url: string | null
          snap_token: string | null
          status: string
          subscription_id: string | null
          ticket_count: number | null
          updated_at: string
          user_id: string
          va_number: string | null
        }
        Insert: {
          actions?: Json | null
          amount: number
          bill_key?: string | null
          biller_code?: string | null
          created_at?: string
          currency?: string | null
          deeplink_url?: string | null
          discount_code_id?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_production?: boolean | null
          lesson_id?: string | null
          metadata?: Json | null
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          original_amount?: number | null
          paid_at?: string | null
          payment_code?: string | null
          payment_method?: string | null
          payment_type?: string | null
          qr_code_url?: string | null
          sequencer_id?: string | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          subscription_id?: string | null
          ticket_count?: number | null
          updated_at?: string
          user_id: string
          va_number?: string | null
        }
        Update: {
          actions?: Json | null
          amount?: number
          bill_key?: string | null
          biller_code?: string | null
          created_at?: string
          currency?: string | null
          deeplink_url?: string | null
          discount_code_id?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_production?: boolean | null
          lesson_id?: string | null
          metadata?: Json | null
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          original_amount?: number | null
          paid_at?: string | null
          payment_code?: string | null
          payment_method?: string | null
          payment_type?: string | null
          qr_code_url?: string | null
          sequencer_id?: string | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          subscription_id?: string | null
          ticket_count?: number | null
          updated_at?: string
          user_id?: string
          va_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_with_duration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sequencer_id_fkey"
            columns: ["sequencer_id"]
            isOneToOne: false
            referencedRelation: "sequencer_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_export_usage: {
        Row: {
          created_at: string
          export_type: string
          exported_at: string
          id: string
          song_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          export_type?: string
          exported_at?: string
          id?: string
          song_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          export_type?: string
          exported_at?: string
          id?: string
          song_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_export_usage_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_export_usage_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_sessions: {
        Row: {
          active_section: string | null
          artist: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          key: string | null
          sections: Json | null
          session_name: string
          song_title: string
          tempo: number | null
          updated_at: string
        }
        Insert: {
          active_section?: string | null
          artist?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key?: string | null
          sections?: Json | null
          session_name: string
          song_title: string
          tempo?: number | null
          updated_at?: string
        }
        Update: {
          active_section?: string | null
          artist?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key?: string | null
          sections?: Json | null
          session_name?: string
          song_title?: string
          tempo?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_benefit_rules: {
        Row: {
          contribution_type: string
          description: string | null
          multiplier: number
        }
        Insert: {
          contribution_type: string
          description?: string | null
          multiplier: number
        }
        Update: {
          contribution_type?: string
          description?: string | null
          multiplier?: number
        }
        Relationships: []
      }
      predefined_responses: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_production: boolean
          priority: number
          response_text: string
          trigger_keywords: string[]
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          priority?: number
          response_text: string
          trigger_keywords: string[]
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          priority?: number
          response_text?: string
          trigger_keywords?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          creator_slug: string | null
          creator_type: Database["public"]["Enums"]["creator_type"] | null
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          experience_level: string | null
          first_name: string | null
          hear_about_us: string | null
          id: string
          instruments: string[] | null
          introduction_description: string | null
          introduction_title: string | null
          introduction_video_url: string | null
          is_feature_tour_completed: boolean
          is_internal: boolean
          is_onboarded: boolean
          is_production: boolean | null
          last_name: string | null
          musical_role: string | null
          permissions: Json | null
          phone_number: string | null
          primary_category:
            | Database["public"]["Enums"]["assessment_category"]
            | null
          primary_instrument:
            | Database["public"]["Enums"]["instrument_type"]
            | null
          role: Database["public"]["Enums"]["user_role"] | null
          skill_tiers: Json | null
          tier_assessment_completed: boolean
          tier_completed_at: string | null
          updated_at: string
          usage_context: string | null
          user_id: string
          youtube_channel: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          creator_slug?: string | null
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          experience_level?: string | null
          first_name?: string | null
          hear_about_us?: string | null
          id?: string
          instruments?: string[] | null
          introduction_description?: string | null
          introduction_title?: string | null
          introduction_video_url?: string | null
          is_feature_tour_completed?: boolean
          is_internal?: boolean
          is_onboarded?: boolean
          is_production?: boolean | null
          last_name?: string | null
          musical_role?: string | null
          permissions?: Json | null
          phone_number?: string | null
          primary_category?:
            | Database["public"]["Enums"]["assessment_category"]
            | null
          primary_instrument?:
            | Database["public"]["Enums"]["instrument_type"]
            | null
          role?: Database["public"]["Enums"]["user_role"] | null
          skill_tiers?: Json | null
          tier_assessment_completed?: boolean
          tier_completed_at?: string | null
          updated_at?: string
          usage_context?: string | null
          user_id: string
          youtube_channel?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          creator_slug?: string | null
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          experience_level?: string | null
          first_name?: string | null
          hear_about_us?: string | null
          id?: string
          instruments?: string[] | null
          introduction_description?: string | null
          introduction_title?: string | null
          introduction_video_url?: string | null
          is_feature_tour_completed?: boolean
          is_internal?: boolean
          is_onboarded?: boolean
          is_production?: boolean | null
          last_name?: string | null
          musical_role?: string | null
          permissions?: Json | null
          phone_number?: string | null
          primary_category?:
            | Database["public"]["Enums"]["assessment_category"]
            | null
          primary_instrument?:
            | Database["public"]["Enums"]["instrument_type"]
            | null
          role?: Database["public"]["Enums"]["user_role"] | null
          skill_tiers?: Json | null
          tier_assessment_completed?: boolean
          tier_completed_at?: string | null
          updated_at?: string
          usage_context?: string | null
          user_id?: string
          youtube_channel?: string | null
        }
        Relationships: []
      }
      push_notification_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          is_production: boolean | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_production?: boolean | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_production?: boolean | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          category: Database["public"]["Enums"]["assessment_category"]
          correct_answer: string
          created_at: string
          difficulty_score: number
          explanation: string | null
          id: string
          is_active: boolean
          is_production: boolean
          media_url: string | null
          options: Json
          question_text: string
          question_type: string
          sub_category: string | null
          tier_level: Database["public"]["Enums"]["tier_level"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["assessment_category"]
          correct_answer: string
          created_at?: string
          difficulty_score: number
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          media_url?: string | null
          options: Json
          question_text: string
          question_type?: string
          sub_category?: string | null
          tier_level: Database["public"]["Enums"]["tier_level"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["assessment_category"]
          correct_answer?: string
          created_at?: string
          difficulty_score?: number
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_production?: boolean
          media_url?: string | null
          options?: Json
          question_text?: string
          question_type?: string
          sub_category?: string | null
          tier_level?: Database["public"]["Enums"]["tier_level"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          is_production: boolean
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown
          is_production?: boolean
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          is_production?: boolean
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      recurring_payment_attempts: {
        Row: {
          amount: number
          attempted_at: string
          completed_at: string | null
          currency: string
          error_message: string | null
          id: string
          is_production: boolean
          linked_account_id: string
          midtrans_order_id: string | null
          midtrans_transaction_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          attempted_at?: string
          completed_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          is_production?: boolean
          linked_account_id: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          attempted_at?: string
          completed_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          is_production?: boolean
          linked_account_id?: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_attempts_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "linked_payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payment_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_weight_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_production: boolean | null
          rejection_reason: string
          updated_at: string | null
          weight_penalty: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          rejection_reason: string
          updated_at?: string | null
          weight_penalty: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          rejection_reason?: string
          updated_at?: string | null
          weight_penalty?: number
        }
        Relationships: []
      }
      request_arrangements: {
        Row: {
          admin_notes: string | null
          amount: number | null
          artist: string
          assigned_at: string | null
          assigned_song_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          is_production: boolean
          status: string
          title: string
          user_id: string | null
          youtube_link: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          artist: string
          assigned_at?: string | null
          assigned_song_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          status?: string
          title: string
          user_id?: string | null
          youtube_link?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          artist?: string
          assigned_at?: string | null
          assigned_song_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          status?: string
          title?: string
          user_id?: string | null
          youtube_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_arrangements_assigned_song_id_fkey"
            columns: ["assigned_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_arrangements_assigned_song_id_fkey"
            columns: ["assigned_song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      section_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          section_id: string
          song_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          section_id: string
          song_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          section_id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_comments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "song_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_comments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_comments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          created_at: string
          description: string
          id: string
          incident_type: string
          ip_address: unknown
          is_production: boolean
          metadata: Json | null
          notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          incident_type: string
          ip_address?: unknown
          is_production?: boolean
          metadata?: Json | null
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          ip_address?: unknown
          is_production?: boolean
          metadata?: Json | null
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sequencer_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          is_production: boolean
          payment_id: string | null
          sequencer_file_id: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          is_production?: boolean
          payment_id?: string | null
          sequencer_file_id: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          is_production?: boolean
          payment_id?: string | null
          sequencer_file_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_enrollments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencer_enrollments_sequencer_file_id_fkey"
            columns: ["sequencer_file_id"]
            isOneToOne: false
            referencedRelation: "sequencer_files"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_file_pricing: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_production: boolean
          price: number
          sequencer_file_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          price?: number
          sequencer_file_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_production?: boolean
          price?: number
          sequencer_file_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_file_pricing_sequencer_file_id_fkey"
            columns: ["sequencer_file_id"]
            isOneToOne: false
            referencedRelation: "sequencer_files"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_files: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_production: boolean
          preview_audio_r2_key: string | null
          sequencer_data: Json
          song_id: string
          storage_folder_path: string
          storage_type: string | null
          tempo: number
          time_signature: string
          title: string
          tracks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_production?: boolean
          preview_audio_r2_key?: string | null
          sequencer_data: Json
          song_id: string
          storage_folder_path: string
          storage_type?: string | null
          tempo: number
          time_signature?: string
          title: string
          tracks: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_production?: boolean
          preview_audio_r2_key?: string | null
          sequencer_data?: Json
          song_id?: string
          storage_folder_path?: string
          storage_type?: string | null
          tempo?: number
          time_signature?: string
          title?: string
          tracks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_files_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencer_files_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_patterns: {
        Row: {
          bpm: number
          created_at: string
          id: string
          is_active: boolean | null
          is_production: boolean
          length: number
          loop_end: number
          loop_start: number
          name: string
          project_id: string
          swing: number
          updated_at: string
        }
        Insert: {
          bpm?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean
          length?: number
          loop_end?: number
          loop_start?: number
          name: string
          project_id: string
          swing?: number
          updated_at?: string
        }
        Update: {
          bpm?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean
          length?: number
          loop_end?: number
          loop_start?: number
          name?: string
          project_id?: string
          swing?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sequencer_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_projects: {
        Row: {
          bpm: number | null
          created_at: string
          id: string
          is_production: boolean
          master_volume: number | null
          name: string
          pattern_length: number | null
          song_id: string | null
          swing: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bpm?: number | null
          created_at?: string
          id?: string
          is_production?: boolean
          master_volume?: number | null
          name: string
          pattern_length?: number | null
          song_id?: string | null
          swing?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bpm?: number | null
          created_at?: string
          id?: string
          is_production?: boolean
          master_volume?: number | null
          name?: string
          pattern_length?: number | null
          song_id?: string | null
          swing?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_projects_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencer_projects_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_steps: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          is_production: boolean
          microtiming: number | null
          note: number | null
          sample_id: string | null
          step_index: number
          track_id: string
          updated_at: string
          velocity: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          is_production?: boolean
          microtiming?: number | null
          note?: number | null
          sample_id?: string | null
          step_index: number
          track_id: string
          updated_at?: string
          velocity?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          is_production?: boolean
          microtiming?: number | null
          note?: number | null
          sample_id?: string | null
          step_index?: number
          track_id?: string
          updated_at?: string
          velocity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_steps_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "sequencer_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          effects_config: Json | null
          id: string
          instrument_config: Json | null
          is_production: boolean
          muted: boolean | null
          name: string
          order_index: number
          pan: number | null
          pattern_id: string
          soloed: boolean | null
          track_type: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          effects_config?: Json | null
          id?: string
          instrument_config?: Json | null
          is_production?: boolean
          muted?: boolean | null
          name: string
          order_index?: number
          pan?: number | null
          pattern_id: string
          soloed?: boolean | null
          track_type: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          effects_config?: Json | null
          id?: string
          instrument_config?: Json | null
          is_production?: boolean
          muted?: boolean | null
          name?: string
          order_index?: number
          pan?: number | null
          pattern_id?: string
          soloed?: boolean | null
          track_type?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_tracks_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "sequencer_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencer_user_sections: {
        Row: {
          created_at: string
          end_time: number | null
          id: string
          is_production: boolean
          sections: Json
          sequencer_file_id: string
          song_section_id: string | null
          start_time: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: number | null
          id?: string
          is_production?: boolean
          sections?: Json
          sequencer_file_id: string
          song_section_id?: string | null
          start_time?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: number | null
          id?: string
          is_production?: boolean
          sections?: Json
          sequencer_file_id?: string
          song_section_id?: string | null
          start_time?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencer_user_sections_sequencer_file_id_fkey"
            columns: ["sequencer_file_id"]
            isOneToOne: false
            referencedRelation: "sequencer_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencer_user_sections_song_section_id_fkey"
            columns: ["song_section_id"]
            isOneToOne: false
            referencedRelation: "song_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_annotations: {
        Row: {
          annotation_data: Json
          created_at: string
          id: string
          is_production: boolean
          section_id: string | null
          setlist_id: string
          song_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_data: Json
          created_at?: string
          id?: string
          is_production?: boolean
          section_id?: string | null
          setlist_id: string
          song_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_data?: Json
          created_at?: string
          id?: string
          is_production?: boolean
          section_id?: string | null
          setlist_id?: string
          song_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setlists: {
        Row: {
          created_at: string
          date: string
          id: string
          is_production: boolean | null
          is_public: boolean
          name: string
          slug: string | null
          song_ids: string[] | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_production?: boolean | null
          is_public?: boolean
          name: string
          slug?: string | null
          song_ids?: string[] | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_production?: boolean | null
          is_public?: boolean
          name?: string
          slug?: string | null
          song_ids?: string[] | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheet_music_files: {
        Row: {
          content_id: string
          created_at: string | null
          file_hash: string | null
          file_url: string
          id: string
          page_count: number | null
          thumbnail_url: string | null
          updated_at: string | null
          watermark_enabled: boolean | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          file_hash?: string | null
          file_url: string
          id?: string
          page_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          file_hash?: string | null
          file_url?: string
          id?: string
          page_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_music_files_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
        ]
      }
      song_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          is_production: boolean
          song_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          is_production?: boolean
          song_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          is_production?: boolean
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_activity_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_activity_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      song_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          permission: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          permission?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          permission?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_collaborators_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_collaborators_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      song_folders: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      song_likes: {
        Row: {
          created_at: string
          id: string
          is_production: boolean | null
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_production?: boolean | null
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_production?: boolean | null
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      song_ratings: {
        Row: {
          created_at: string | null
          id: string
          is_production: boolean | null
          rating: number
          song_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          rating: number
          song_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          rating?: number
          song_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_ratings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_ratings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      song_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          is_production: boolean | null
          report_details: string | null
          report_reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          song_id: string
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          report_details?: string | null
          report_reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          song_id: string
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          is_production?: boolean | null
          report_details?: string | null
          report_reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          song_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "song_reports_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_reports_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      song_sections: {
        Row: {
          bar_count: number | null
          chords: string | null
          created_at: string
          id: string
          is_production: boolean
          lyrics: string | null
          name: string | null
          section_category: string | null
          section_time_signature:
            | Database["public"]["Enums"]["time_signature"]
            | null
          section_type: string
          section_type_original: string | null
          song_id: string
          updated_at: string
        }
        Insert: {
          bar_count?: number | null
          chords?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          lyrics?: string | null
          name?: string | null
          section_category?: string | null
          section_time_signature?:
            | Database["public"]["Enums"]["time_signature"]
            | null
          section_type: string
          section_type_original?: string | null
          song_id: string
          updated_at?: string
        }
        Update: {
          bar_count?: number | null
          chords?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          lyrics?: string | null
          name?: string | null
          section_category?: string | null
          section_time_signature?:
            | Database["public"]["Enums"]["time_signature"]
            | null
          section_type?: string
          section_type_original?: string | null
          song_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_sections_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_sections_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string | null
          audio_url: string | null
          capo: number | null
          category: string | null
          contribution_type: string | null
          created_at: string
          created_by: string | null
          created_sign: string | null
          current_key: Database["public"]["Enums"]["song_key"]
          difficulty: string | null
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          is_production: boolean | null
          is_public: boolean
          last_viewed_at: string | null
          notes: string | null
          original_creator_id: string | null
          original_key: Database["public"]["Enums"]["song_key"]
          rating: number | null
          sequencer_drive_link: string | null
          sequencer_price: number | null
          slug: string | null
          status: string | null
          tags: string[] | null
          tempo: number | null
          theme: string | null
          time_signature: string
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
          youtube_link: string | null
          youtube_thumbnail: string | null
        }
        Insert: {
          artist?: string | null
          audio_url?: string | null
          capo?: number | null
          category?: string | null
          contribution_type?: string | null
          created_at?: string
          created_by?: string | null
          created_sign?: string | null
          current_key?: Database["public"]["Enums"]["song_key"]
          difficulty?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_production?: boolean | null
          is_public?: boolean
          last_viewed_at?: string | null
          notes?: string | null
          original_creator_id?: string | null
          original_key?: Database["public"]["Enums"]["song_key"]
          rating?: number | null
          sequencer_drive_link?: string | null
          sequencer_price?: number | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          tempo?: number | null
          theme?: string | null
          time_signature: string
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
          youtube_link?: string | null
          youtube_thumbnail?: string | null
        }
        Update: {
          artist?: string | null
          audio_url?: string | null
          capo?: number | null
          category?: string | null
          contribution_type?: string | null
          created_at?: string
          created_by?: string | null
          created_sign?: string | null
          current_key?: Database["public"]["Enums"]["song_key"]
          difficulty?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_production?: boolean | null
          is_public?: boolean
          last_viewed_at?: string | null
          notes?: string | null
          original_creator_id?: string | null
          original_key?: Database["public"]["Enums"]["song_key"]
          rating?: number | null
          sequencer_drive_link?: string | null
          sequencer_price?: number | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          tempo?: number | null
          theme?: string | null
          time_signature?: string
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
          youtube_link?: string | null
          youtube_thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "song_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_user_id_fkey_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_cancellations: {
        Row: {
          accepted_discount: boolean | null
          canceled_at: string
          feedback: string | null
          id: string
          offered_discount: boolean | null
          reason: string | null
          reason_category: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          accepted_discount?: boolean | null
          canceled_at?: string
          feedback?: string | null
          id?: string
          offered_discount?: boolean | null
          reason?: string | null
          reason_category?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          accepted_discount?: boolean | null
          canceled_at?: string
          feedback?: string | null
          id?: string
          offered_discount?: boolean | null
          reason?: string | null
          reason_category?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          features: Json | null
          id: string
          interval_count: number | null
          interval_type: string
          is_active: boolean | null
          is_production: boolean | null
          library_limit: number | null
          name: string
          original_price: number | null
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval_count?: number | null
          interval_type?: string
          is_active?: boolean | null
          is_production?: boolean | null
          library_limit?: number | null
          name: string
          original_price?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval_count?: number | null
          interval_type?: string
          is_active?: boolean | null
          is_production?: boolean | null
          library_limit?: number | null
          name?: string
          original_price?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_record: {
        Row: {
          auto_payment_enabled: boolean | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          features: Json | null
          id: string | null
          is_trial: boolean | null
          last_payment_status: string | null
          last_retry_at: string | null
          midtrans_subscription_id: string | null
          next_payment_attempt: string | null
          payment_failed_count: number | null
          plan_id: string | null
          retry_count: number | null
          status: string | null
          trial_end: string | null
          trial_expired: boolean | null
          trial_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_payment_enabled?: boolean | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          features?: Json | null
          id?: string | null
          is_trial?: boolean | null
          last_payment_status?: string | null
          last_retry_at?: string | null
          midtrans_subscription_id?: string | null
          next_payment_attempt?: string | null
          payment_failed_count?: number | null
          plan_id?: string | null
          retry_count?: number | null
          status?: string | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_payment_enabled?: boolean | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          features?: Json | null
          id?: string | null
          is_trial?: boolean | null
          last_payment_status?: string | null
          last_retry_at?: string | null
          midtrans_subscription_id?: string | null
          next_payment_attempt?: string | null
          payment_failed_count?: number | null
          plan_id?: string | null
          retry_count?: number | null
          status?: string | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_payment_enabled: boolean | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_interval: number | null
          current_period_end: string | null
          current_period_start: string | null
          grace_period_end: string | null
          grace_period_started_at: string | null
          id: string
          is_trial: boolean | null
          last_payment_status: string | null
          last_retry_at: string | null
          midtrans_subscription_id: string | null
          midtrans_subscription_status: string | null
          midtrans_subscription_token: string | null
          next_billing_date: string | null
          next_payment_attempt: string | null
          payment_failed_count: number | null
          plan_id: string | null
          retry_count: number | null
          status: string
          subscription_schedule: Json | null
          trial_end: string | null
          trial_expired: boolean | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_payment_enabled?: boolean | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_interval?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          grace_period_started_at?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_status?: string | null
          last_retry_at?: string | null
          midtrans_subscription_id?: string | null
          midtrans_subscription_status?: string | null
          midtrans_subscription_token?: string | null
          next_billing_date?: string | null
          next_payment_attempt?: string | null
          payment_failed_count?: number | null
          plan_id?: string | null
          retry_count?: number | null
          status?: string
          subscription_schedule?: Json | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_payment_enabled?: boolean | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_interval?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          grace_period_started_at?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_status?: string | null
          last_retry_at?: string | null
          midtrans_subscription_id?: string | null
          midtrans_subscription_status?: string | null
          midtrans_subscription_token?: string | null
          next_billing_date?: string | null
          next_payment_attempt?: string | null
          payment_failed_count?: number | null
          plan_id?: string | null
          retry_count?: number | null
          status?: string
          subscription_schedule?: Json | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          is_production: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_production?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_production?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_assessment_questions: {
        Row: {
          category: string
          created_at: string | null
          explanation: string | null
          id: string
          instrument: string
          is_production: boolean
          media_url: string | null
          options: Json
          order_index: number
          question_text: string
          sub_category: string
          tier_level: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          instrument: string
          is_production?: boolean
          media_url?: string | null
          options: Json
          order_index?: number
          question_text: string
          sub_category: string
          tier_level: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          instrument?: string
          is_production?: boolean
          media_url?: string | null
          options?: Json
          order_index?: number
          question_text?: string
          sub_category?: string
          tier_level?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tier_assessment_thresholds: {
        Row: {
          category: string
          created_at: string
          id: string
          instrument: string | null
          is_production: boolean
          pass_threshold: number
          sub_category: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          instrument?: string | null
          is_production?: boolean
          pass_threshold?: number
          sub_category: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          instrument?: string | null
          is_production?: boolean
          pass_threshold?: number
          sub_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_admin_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_production: boolean
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_production?: boolean
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_admin_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_assessment_progress: {
        Row: {
          category_id: string
          created_at: string
          current_level: Database["public"]["Enums"]["assessment_level"]
          highest_level_achieved: Database["public"]["Enums"]["assessment_level"]
          id: string
          is_production: boolean
          last_attempt_at: string | null
          sub_category_id: string | null
          total_attempts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          current_level: Database["public"]["Enums"]["assessment_level"]
          highest_level_achieved: Database["public"]["Enums"]["assessment_level"]
          id?: string
          is_production?: boolean
          last_attempt_at?: string | null
          sub_category_id?: string | null
          total_attempts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          current_level?: Database["public"]["Enums"]["assessment_level"]
          highest_level_achieved?: Database["public"]["Enums"]["assessment_level"]
          id?: string
          is_production?: boolean
          last_attempt_at?: string | null
          sub_category_id?: string | null
          total_attempts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assessment_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assessment_progress_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "assessment_sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          is_production: boolean | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          is_production?: boolean | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          is_production?: boolean | null
        }
        Relationships: []
      }
      user_library_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_production: boolean
          song_id: string
          song_original_id: string | null
          user_id: string
          user_original_id: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          is_production?: boolean
          song_id: string
          song_original_id?: string | null
          user_id: string
          user_original_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_production?: boolean
          song_id?: string
          song_original_id?: string | null
          user_id?: string
          user_original_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_library_actions_songs"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_library_actions_songs"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs_with_earnings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          current_session_id: string
          device_info: Json | null
          id: string
          is_production: boolean
          last_login_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_session_id: string
          device_info?: Json | null
          id?: string
          is_production?: boolean
          last_login_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_session_id?: string
          device_info?: Json | null
          id?: string
          is_production?: boolean
          last_login_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tier_progress: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          current_tier: number
          highest_tier_reached: number
          id: string
          instrument: string
          is_production: boolean
          questions_answered: number
          sub_category: string
          total_score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          current_tier?: number
          highest_tier_reached?: number
          id?: string
          instrument: string
          is_production?: boolean
          questions_answered?: number
          sub_category: string
          total_score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          current_tier?: number
          highest_tier_reached?: number
          id?: string
          instrument?: string
          is_production?: boolean
          questions_answered?: number
          sub_category?: string
          total_score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_creator: {
        Row: {
          available_amount: number
          created_at: string
          creator_id: string
          id: string
          is_production: boolean
          total_earned: number
          updated_at: string
        }
        Insert: {
          available_amount?: number
          created_at?: string
          creator_id: string
          id?: string
          is_production?: boolean
          total_earned?: number
          updated_at?: string
        }
        Update: {
          available_amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          is_production?: boolean
          total_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      youtube_import_usage: {
        Row: {
          created_at: string
          id: string
          import_type: string
          imported_at: string
          user_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_type?: string
          imported_at?: string
          user_id: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          import_type?: string
          imported_at?: string
          user_id?: string
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      event_ushers_with_profiles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          avatar_url: string | null
          display_name: string | null
          event_id: string | null
          id: string | null
          is_production: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_ushers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons_with_duration: {
        Row: {
          average_rating: number | null
          category: Database["public"]["Enums"]["lesson_category"] | null
          cover_image_url: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["lesson_difficulty"]
            | null
          download_prevention: boolean | null
          duration_minutes: number | null
          id: string | null
          instructor_avatar: string | null
          instructor_name: string | null
          is_free: boolean | null
          is_production: boolean | null
          learning_outcomes: string[] | null
          lesson_type: Database["public"]["Enums"]["lesson_type"] | null
          max_concurrent_sessions: number | null
          price: number | null
          published_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["lesson_status"] | null
          subcategory: string | null
          title: string | null
          total_duration: number | null
          total_enrollments: number | null
          updated_at: string | null
          watermark_enabled: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      songs_with_earnings: {
        Row: {
          artist: string | null
          audio_url: string | null
          capo: number | null
          category: string | null
          contribution_type: string | null
          created_at: string | null
          created_by: string | null
          created_sign: string | null
          current_key: Database["public"]["Enums"]["song_key"] | null
          difficulty: string | null
          earnings: number | null
          folder_id: string | null
          id: string | null
          is_favorite: boolean | null
          is_production: boolean | null
          is_public: boolean | null
          last_viewed_at: string | null
          notes: string | null
          original_creator_id: string | null
          original_key: Database["public"]["Enums"]["song_key"] | null
          rating: number | null
          sequencer_drive_link: string | null
          sequencer_price: number | null
          slug: string | null
          status: string | null
          tags: string[] | null
          tempo: number | null
          theme: string | null
          time_signature: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          youtube_link: string | null
          youtube_thumbnail: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "song_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_user_id_fkey_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      add_song_to_library_atomic: {
        Args: { p_original_song_id: string; p_user_id: string }
        Returns: Json
      }
      admin_add_to_lesson_whitelist: {
        Args: { p_lesson_id: string; p_notes?: string; p_user_id: string }
        Returns: string
      }
      admin_delete_from_lesson_whitelist: {
        Args: { p_id: string }
        Returns: boolean
      }
      admin_get_lesson_whitelist: {
        Args: { p_limit?: number; p_page?: number; p_search?: string }
        Returns: {
          added_by: string
          added_by_name: string
          created_at: string
          id: string
          lesson_id: string
          lesson_title: string
          notes: string
          total_count: number
          updated_at: string
          user_display_name: string
          user_email: string
          user_id: string
        }[]
      }
      admin_get_lessons_for_whitelist: {
        Args: never
        Returns: {
          id: string
          title: string
        }[]
      }
      admin_search_users_for_whitelist: {
        Args: { p_search?: string }
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      admin_update_lesson_whitelist: {
        Args: { p_id: string; p_notes: string }
        Returns: boolean
      }
      book_event_quota: {
        Args: {
          p_payment_id: string
          p_ticket_category_id: string
          p_ticket_count: number
        }
        Returns: Json
      }
      calculate_community_score: {
        Args: { creator_id: string }
        Returns: number
      }
      calculate_validation_score: {
        Args: { creator_id: string }
        Returns: number
      }
      can_create_withdrawal: {
        Args: { creator_id_param: string }
        Returns: boolean
      }
      check_rpc_rate_limit: {
        Args: { function_name: string; user_id_param?: string }
        Returns: boolean
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_security_incidents: { Args: never; Returns: undefined }
      collect_chords_from_songs: { Args: never; Returns: number }
      deactivate_expired_benefit_configs: { Args: never; Returns: undefined }
      expire_event_payments: { Args: never; Returns: number }
      generate_booking_id: { Args: never; Returns: string }
      generate_creator_slug: {
        Args: { display_name_param: string }
        Returns: string
      }
      generate_secure_booking_id: { Args: never; Returns: string }
      generate_seo_slug: { Args: { title_param: string }; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      generate_unique_event_slug: {
        Args: { event_id_param?: string; title_param: string }
        Returns: string
      }
      generate_unique_lesson_slug: {
        Args: { lesson_id_param?: string; title_param: string }
        Returns: string
      }
      generate_unique_setlist_slug: {
        Args: { name_param: string; setlist_id_param?: string }
        Returns: string
      }
      generate_unique_song_slug: {
        Args: { song_id_param?: string; title_param: string }
        Returns: string
      }
      get_admin_customer_metrics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          churned_customers: number
          four_plus_renewed: number
          new_customers: number
          once_renewed: number
          subscriptions_by_plan: Json
          three_times_renewed: number
          total_renewals: number
          twice_renewed: number
        }[]
      }
      get_admin_engagement_stats: {
        Args: never
        Returns: {
          active_subscriptions: number
          pending_applications: number
          total_exports: number
          total_likes: number
        }[]
      }
      get_admin_payments_data: {
        Args: never
        Returns: {
          amount: number
          code: string
          created_at: string
          currency: string
          id: string
          midtrans_order_id: string
          midtrans_transaction_id: string
          original_amount: number
          paid_at: string
          payment_method: string
          plan_name: string
          status: string
          subscription_status: string
          user_email: string
        }[]
      }
      get_admin_recent_activity: {
        Args: never
        Returns: {
          recent_payments: Json
          recent_songs: Json
          recent_users: Json
        }[]
      }
      get_admin_revenue_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          gross_revenue: number
          monthly_revenue: number
          net_revenue: number
          total_discount: number
        }[]
      }
      get_admin_song_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          monthly_growth: number
          total_songs: number
          total_views: number
        }[]
      }
      get_admin_user_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          monthly_growth: number
          total_users: number
        }[]
      }
      get_admin_users_with_emails: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          created_at: string
          creator_type: Database["public"]["Enums"]["creator_type"]
          display_name: string
          email: string
          experience_level: string
          first_name: string
          hear_about_us: string
          instruments: string[]
          is_onboarded: boolean
          is_production: boolean
          last_name: string
          musical_role: string
          permissions: Json
          phone_number: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          usage_context: string
          user_id: string
          youtube_channel: string
        }[]
      }
      get_chat_settings: { Args: { user_id: string }; Returns: boolean }
      get_chord_review_queue: {
        Args: never
        Returns: {
          ai_confidence: number
          chord_name: string
          created_at: string
          id: string
          occurrence_count: number
          sample_song_titles: string[]
          status: string
          suggested_quality: string
          suggested_root_note: string
        }[]
      }
      get_client_ip: { Args: never; Returns: unknown }
      get_creator_dashboard_data: { Args: { p_user_id: string }; Returns: Json }
      get_creator_discount_earnings: {
        Args: { creator_id: string }
        Returns: {
          monthly_earnings: number
          total_earnings: number
          total_uses: number
        }[]
      }
      get_creator_earnings: {
        Args: { creator_id: string }
        Returns: {
          library_add_earnings: number
          monthly_earnings: number
          song_publish_earnings: number
          total_earnings: number
          total_library_adds: number
        }[]
      }
      get_creator_lesson_earnings_breakdown: {
        Args: { target_creator_id: string }
        Returns: {
          benefit_percentage: number
          buyer_name: string
          creator_net_amount: number
          lesson_id: string
          lesson_title: string
          platform_fee_amount: number
          status: string
          total_amount: number
          transaction_date: string
        }[]
      }
      get_creator_songs_stats: {
        Args: { p_creator_id: string; p_date_from?: string; p_date_to?: string }
        Returns: {
          artist: string
          created_at: string
          id: number
          is_public: boolean
          sequencer_price: number
          title: string
          total_downloads: number
          total_earnings: number
          user_id: string
          views_count: number
        }[]
      }
      get_creator_stats: { Args: { p_creator_id: string }; Returns: Json }
      get_current_environment: { Args: never; Returns: boolean }
      get_lesson_enrollment_count: {
        Args: { lesson_uuid: string }
        Returns: number
      }
      get_menu_id_from_path: { Args: { check_path: string }; Returns: string }
      get_next_available_session: {
        Args: { p_event_id: string }
        Returns: string
      }
      get_or_create_wallet: {
        Args: { creator_id_param: string }
        Returns: {
          available_amount: number
          created_at: string
          creator_id: string
          id: string
          is_production: boolean
          total_earned: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_creator"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_previous_payment_details: {
        Args: { creator_id_param: string }
        Returns: {
          method: string
          payment_details: Json
        }[]
      }
      get_public_songs: {
        Args: {
          p_category: string
          p_creator_filter: string
          p_current_user_id?: string
          p_followed_ids: string[]
          p_page_num: number
          p_page_size: number
          p_search_term: string
          p_show_followed_only: boolean
          p_sort_by: string
        }
        Returns: Json
      }
      get_publication_for_review: {
        Args: { publication_id: string }
        Returns: {
          created_at: string
          id: string
          is_production: boolean
          published_at: string
          rejected_reason: string
          review_notes: string
          song_artist: string
          song_id: string
          song_title: string
          song_user_id: string
          song_youtube_link: string
          status: string
          updated_at: string
          user_id: string
          validation_results: Json
        }[]
      }
      get_rate_limit_status: {
        Args: { target_user_id?: string }
        Returns: {
          current_count: number
          endpoint: string
          rate_limit: number
          time_remaining: unknown
          window_start: string
        }[]
      }
      get_revamp_admin_users_with_emails: {
        Args: { limit_count?: number; page?: number; search_term?: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          created_at: string
          creator_type: string
          display_name: string
          email: string
          experience_level: string
          first_name: string
          hear_about_us: string
          instruments: string[]
          is_onboarded: boolean
          is_production: boolean
          last_name: string
          musical_role: string
          permissions: Json
          phone_number: string
          profile_id: string
          role: string
          total_count: number
          updated_at: string
          usage_context: string
          user_id: string
          youtube_channel: string
        }[]
      }
      get_secure_lesson_modules: {
        Args: { p_lesson_id: string }
        Returns: Json
      }
      get_song_library_count: { Args: { song_id: string }; Returns: number }
      get_song_like_count: { Args: { song_id: string }; Returns: number }
      get_top_songs: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          artist: string
          avatar_url: string
          created_at: string
          creator_type: string
          current_key: string
          display_name: string
          id: string
          slug: string
          tags: string[]
          tempo: number
          title: string
          user_id: string
          views_count: number
          youtube_link: string
          youtube_thumbnail: string
        }[]
      }
      get_trending_songs_from_activity: {
        Args: { limit_val?: number }
        Returns: {
          arranger: string
          arranger_avatar: string
          arranger_slug: string
          artist: string
          current_key: string
          id: string
          is_trusted: boolean
          slug: string
          tempo: number
          title: string
          total_views: number
          youtube_thumbnail: string
        }[]
      }
      get_unsubscribed_user_ids: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_feature: {
        Args: { feature_key: string; user_id_param: string }
        Returns: boolean
      }
      get_user_menu_permissions: {
        Args: { check_user_id: string }
        Returns: {
          can_access: boolean
          menu_id: string
        }[]
      }
      get_user_menu_permissions_with_details: {
        Args: { check_user_id: string }
        Returns: {
          can_access: boolean
          detail_paths: string[]
          menu_id: string
        }[]
      }
      get_user_monthly_export_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_user_monthly_youtube_import_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_user_pdf_export_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_weekly_trending_songs: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          artist: string
          avatar_url: string
          created_at: string
          creator_type: string
          current_key: string
          display_name: string
          id: string
          slug: string
          tags: string[]
          tempo: number
          title: string
          user_id: string
          views_count: number
          youtube_link: string
          youtube_thumbnail: string
        }[]
      }
      handle_late_event_payment:
        | { Args: { p_payment_id: string }; Returns: Json }
        | {
            Args: {
              p_payment_id: string
              p_ticket_category_id: string
              p_ticket_count: number
            }
            Returns: Json
          }
      has_lesson_access: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      increment_discount_code_usage: {
        Args: { p_discount_code_id: string }
        Returns: undefined
      }
      increment_song_views: { Args: { song_id: string }; Returns: undefined }
      is_admin_user: { Args: { check_user_id: string }; Returns: boolean }
      is_benefit_config_active: {
        Args: { config_id: string }
        Returns: boolean
      }
      is_benefit_period_active: {
        Args: { p_config_id: string }
        Returns: boolean
      }
      is_live_preview_context: { Args: never; Returns: boolean }
      is_whitelisted_for_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      populate_chord_review_queue: { Args: never; Returns: number }
      rate_limited_rpc: {
        Args: { function_name: string; params?: Json }
        Returns: Json
      }
      register_event: {
        Args: {
          p_amount_paid: number
          p_attendee_email: string
          p_attendee_name: string
          p_attendee_phone: string
          p_booking_id: string
          p_event_id: string
          p_payment_status: string
          p_qr_code: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      release_expired_payment_quota: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      reserve_session_quota: {
        Args: { p_session_id: string; p_ticket_count: number }
        Returns: boolean
      }
      reset_user_rate_limits: {
        Args: { operation_type?: string; target_user_id: string }
        Returns: boolean
      }
      reverse_event_quota: { Args: { p_payment_id: string }; Returns: Json }
      sanitize_user_content: { Args: { content_text: string }; Returns: string }
      update_chord_references_in_songs: {
        Args: { new_chord_data: Json; old_chord_name: string }
        Returns: undefined
      }
      update_creator_pro_score: {
        Args: { creator_id: string }
        Returns: undefined
      }
      use_event_quota: { Args: { p_payment_id: string }; Returns: Json }
      user_can_access_song: {
        Args: { _song_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_edit_song: {
        Args: { _song_id: string; _user_id: string }
        Returns: boolean
      }
      user_follows_creator: {
        Args: { creator_id: string; user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { permission: string; user_id: string }
        Returns: boolean
      }
      user_likes_song: {
        Args: { song_id: string; user_id: string }
        Returns: boolean
      }
      validate_arrangement_limit: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      validate_library_limit: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      validate_user_subscription: {
        Args: { feature_name: string; user_id_param: string }
        Returns: boolean
      }
      verify_user_enrollment: {
        Args: { p_lesson_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      assessment_category:
        | "instrument"
        | "theory"
        | "production"
        | "worship_leading"
        | "songwriting"
      assessment_level: "beginner" | "intermediate" | "advanced" | "master"
      chord_instrument: "guitar" | "piano" | "both"
      chord_quality:
        | "maj"
        | "min"
        | "dim"
        | "aug"
        | "7"
        | "maj7"
        | "min7"
        | "sus2"
        | "sus4"
        | "add2"
        | "add9"
        | "add11"
        | "6"
        | "9"
        | "11"
        | "13"
        | "m6"
        | "m9"
        | "m11"
        | "m13"
        | "7sus4"
        | "maj7sus4"
        | "maj9"
        | "maj11"
        | "maj13"
        | "7b5"
        | "7#5"
        | "7b9"
        | "7#9"
        | "7#11"
        | "maj7b5"
        | "maj7#5"
        | "maj7#11"
        | "m7b5"
        | "m7#5"
        | "mMaj7"
        | "dim7"
        | "aug7"
        | "alt"
      chord_status: "approved" | "draft" | "deprecated"
      content_type:
        | "video"
        | "text"
        | "audio"
        | "exercise"
        | "quiz"
        | "jam_session"
        | "sheet_music"
        | "interactive_exercise"
        | "chord_chart"
        | "resource"
      creator_type: "creator_arrangely" | "creator_professional" | "creator_pro"
      instrument_type: "guitar" | "piano" | "both"
      lesson_category:
        | "instrument"
        | "theory"
        | "production"
        | "worship_leading"
        | "songwriting"
      lesson_difficulty: "beginner" | "intermediate" | "advanced" | "master"
      lesson_status: "draft" | "published" | "archived"
      lesson_type: "video" | "live" | "hybrid" | "interactive"
      section_type:
        | "verse"
        | "chorus"
        | "bridge"
        | "pre-chorus"
        | "outro"
        | "intro"
        | "instrumental"
        | "tag"
        | "coda"
      song_key:
        | "C"
        | "C#"
        | "Db"
        | "D"
        | "D#"
        | "Eb"
        | "E"
        | "F"
        | "F#"
        | "Gb"
        | "G"
        | "G#"
        | "Ab"
        | "A"
        | "A#"
        | "Bb"
        | "B"
      tier_level: "beginner" | "intermediate" | "advanced" | "master"
      tier_status: "locked" | "in_progress" | "passed" | "failed"
      time_signature:
        | "4/4"
        | "3/4"
        | "2/4"
        | "6/8"
        | "9/8"
        | "12/8"
        | "5/4"
        | "7/8"
      user_role: "admin" | "creator" | "user" | "support_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assessment_category: [
        "instrument",
        "theory",
        "production",
        "worship_leading",
        "songwriting",
      ],
      assessment_level: ["beginner", "intermediate", "advanced", "master"],
      chord_instrument: ["guitar", "piano", "both"],
      chord_quality: [
        "maj",
        "min",
        "dim",
        "aug",
        "7",
        "maj7",
        "min7",
        "sus2",
        "sus4",
        "add2",
        "add9",
        "add11",
        "6",
        "9",
        "11",
        "13",
        "m6",
        "m9",
        "m11",
        "m13",
        "7sus4",
        "maj7sus4",
        "maj9",
        "maj11",
        "maj13",
        "7b5",
        "7#5",
        "7b9",
        "7#9",
        "7#11",
        "maj7b5",
        "maj7#5",
        "maj7#11",
        "m7b5",
        "m7#5",
        "mMaj7",
        "dim7",
        "aug7",
        "alt",
      ],
      chord_status: ["approved", "draft", "deprecated"],
      content_type: [
        "video",
        "text",
        "audio",
        "exercise",
        "quiz",
        "jam_session",
        "sheet_music",
        "interactive_exercise",
        "chord_chart",
        "resource",
      ],
      creator_type: [
        "creator_arrangely",
        "creator_professional",
        "creator_pro",
      ],
      instrument_type: ["guitar", "piano", "both"],
      lesson_category: [
        "instrument",
        "theory",
        "production",
        "worship_leading",
        "songwriting",
      ],
      lesson_difficulty: ["beginner", "intermediate", "advanced", "master"],
      lesson_status: ["draft", "published", "archived"],
      lesson_type: ["video", "live", "hybrid", "interactive"],
      section_type: [
        "verse",
        "chorus",
        "bridge",
        "pre-chorus",
        "outro",
        "intro",
        "instrumental",
        "tag",
        "coda",
      ],
      song_key: [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
      ],
      tier_level: ["beginner", "intermediate", "advanced", "master"],
      tier_status: ["locked", "in_progress", "passed", "failed"],
      time_signature: ["4/4", "3/4", "2/4", "6/8", "9/8", "12/8", "5/4", "7/8"],
      user_role: ["admin", "creator", "user", "support_admin"],
    },
  },
} as const
