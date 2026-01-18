// ============================================================================
// DATABASE TYPES
// Generated from Kilo Database Schema
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'importer' | 'supplier' | 'broker';

export type OrderStatus =
  | 'draft'
  | 'quote_pending'
  | 'quote_approved'
  | 'order_confirmed'
  | 'proforma_pending'
  | 'proforma_approved'
  | 'payment_pending'
  | 'shipped'
  | 'customs_clearance'
  | 'released'
  | 'completed'
  | 'cancelled';

export type DocumentCategory =
  | 'quote'
  | 'proforma_invoice'
  | 'commercial_invoice'
  | 'packing_list'
  | 'phytosanitary_certificate'
  | 'bill_of_lading'
  | 'euro1_certificate'
  | 'broker_invoice'
  | 'other';

export type AiStatus = 'pending' | 'processing' | 'success' | 'failed';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'review_needed';

export type SizeType = 'uniform' | 'mixed';

// Size Configuration Interfaces
export interface UniformSize {
  type: 'uniform';
  size: string;
  quantity: number;
  price_per_unit: number;
}

export interface MixedSizeItem {
  size: string;
  quantity: number;
  price_per_unit: number;
}

export interface MixedSize {
  type: 'mixed';
  items: MixedSizeItem[];
}

export type SizeConfiguration = UniformSize | MixedSize;

// Payment Terms Interface
export interface PaymentTerm {
  stage: string; // 'advance', 'release', 'final', etc.
  percent: number;
  amount?: number;
  due_date?: string;
}

// Database Schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          company_name: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          company_name?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          company_name?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: OrderStatus;
          po_number: string | null;
          order_date: string | null;
          expected_delivery_date: string | null;
          product_name: string;
          variety: string | null;
          packaging: string | null;
          kg_per_box: number | null;
          hs_code: string | null;
          sizes_json: Json;
          payment_terms_json: Json;
          container_number: string | null;
          shipping_line: string | null;
          vessel_name: string | null;
          estimated_arrival_date: string | null;
          actual_arrival_date: string | null;
          port_of_loading: string | null;
          port_of_discharge: string | null;
          total_quantity: number | null;
          total_weight_kg: number | null;
          total_amount: number | null;
          currency: string | null;
          supplier_id: string;
          importer_id: string;
          broker_id: string | null;
          notes: string | null;
          internal_notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: OrderStatus;
          po_number?: string | null;
          order_date?: string | null;
          expected_delivery_date?: string | null;
          product_name: string;
          variety?: string | null;
          packaging?: string | null;
          kg_per_box?: number | null;
          hs_code?: string | null;
          sizes_json?: Json;
          payment_terms_json?: Json;
          container_number?: string | null;
          shipping_line?: string | null;
          vessel_name?: string | null;
          estimated_arrival_date?: string | null;
          actual_arrival_date?: string | null;
          port_of_loading?: string | null;
          port_of_discharge?: string | null;
          total_quantity?: number | null;
          total_weight_kg?: number | null;
          total_amount?: number | null;
          currency?: string | null;
          supplier_id: string;
          importer_id: string;
          broker_id?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: OrderStatus;
          po_number?: string | null;
          order_date?: string | null;
          expected_delivery_date?: string | null;
          product_name?: string;
          variety?: string | null;
          packaging?: string | null;
          kg_per_box?: number | null;
          hs_code?: string | null;
          sizes_json?: Json;
          payment_terms_json?: Json;
          container_number?: string | null;
          shipping_line?: string | null;
          vessel_name?: string | null;
          estimated_arrival_date?: string | null;
          actual_arrival_date?: string | null;
          port_of_loading?: string | null;
          port_of_discharge?: string | null;
          total_quantity?: number | null;
          total_weight_kg?: number | null;
          total_amount?: number | null;
          currency?: string | null;
          supplier_id?: string;
          importer_id?: string;
          broker_id?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_supplier_id_fkey';
            columns: ['supplier_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_importer_id_fkey';
            columns: ['importer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_broker_id_fkey';
            columns: ['broker_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          order_id: string;
          category: DocumentCategory;
          file_name: string;
          file_url: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          ai_status: AiStatus;
          ai_data: Json | null;
          ai_confidence_score: number | null;
          ai_processed_at: string | null;
          ai_error_message: string | null;
          approval_status: ApprovalStatus;
          validation_result: Json | null;
          match_percentage: number | null;
          approved_by: string | null;
          approved_at: string | null;
          rejected_reason: string | null;
          uploader_id: string;
          version: number;
          replaces_document_id: string | null;
          notes: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          order_id: string;
          category: DocumentCategory;
          file_name: string;
          file_url: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          ai_status?: AiStatus;
          ai_data?: Json | null;
          ai_confidence_score?: number | null;
          ai_processed_at?: string | null;
          ai_error_message?: string | null;
          approval_status?: ApprovalStatus;
          validation_result?: Json | null;
          match_percentage?: number | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          uploader_id: string;
          version?: number;
          replaces_document_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          order_id?: string;
          category?: DocumentCategory;
          file_name?: string;
          file_url?: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          ai_status?: AiStatus;
          ai_data?: Json | null;
          ai_confidence_score?: number | null;
          ai_processed_at?: string | null;
          ai_error_message?: string | null;
          approval_status?: ApprovalStatus;
          validation_result?: Json | null;
          match_percentage?: number | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          uploader_id?: string;
          version?: number;
          replaces_document_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_uploader_id_fkey';
            columns: ['uploader_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_approved_by_fkey';
            columns: ['approved_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_replaces_document_id_fkey';
            columns: ['replaces_document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      payment_records: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          order_id: string;
          stage: string;
          amount: number;
          currency: string | null;
          payment_date: string;
          payment_method: string | null;
          reference_number: string | null;
          proof_document_id: string | null;
          recorded_by: string;
          verified_by: string | null;
          verified_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          order_id: string;
          stage: string;
          amount: number;
          currency?: string | null;
          payment_date: string;
          payment_method?: string | null;
          reference_number?: string | null;
          proof_document_id?: string | null;
          recorded_by: string;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          order_id?: string;
          stage?: string;
          amount?: number;
          currency?: string | null;
          payment_date?: string;
          payment_method?: string | null;
          reference_number?: string | null;
          proof_document_id?: string | null;
          recorded_by?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_records_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_records_proof_document_id_fkey';
            columns: ['proof_document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_records_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_records_verified_by_fkey';
            columns: ['verified_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      activity_log: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_value: Json | null;
          new_value: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link_url: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read: boolean;
          read_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          link_url?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean;
          read_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          link_url?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean;
          read_at?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      calculate_order_totals: {
        Args: {
          sizes: Json;
        };
        Returns: {
          total_qty: number;
          total_amount: number;
        }[];
      };
      is_auto_approved: {
        Args: {
          match_pct: number;
        };
        Returns: boolean;
      };
      log_activity: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id: string;
          p_old_value?: Json;
          p_new_value?: Json;
          p_metadata?: Json;
        };
        Returns: string;
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_message: string;
          p_type?: string;
          p_link_url?: string;
          p_entity_type?: string;
          p_entity_id?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      document_category: DocumentCategory;
      ai_status: AiStatus;
      approval_status: ApprovalStatus;
      size_type: SizeType;
    };
    CompositeTypes: {};
  };
}

