// ============================================================================
// KILO - TypeScript Type Definitions
// Business logic types for the entire application
// ============================================================================

import type { Database } from '@/lib/supabase/database.types';

// Re-export database types for convenience
export type { Database };

// Extract table row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type PaymentRecord = Database['public']['Tables']['payment_records']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_log']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Extract insert types (for creating new records)
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type PaymentRecordInsert = Database['public']['Tables']['payment_records']['Insert'];
export type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// Extract update types (for updating records)
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type PaymentRecordUpdate = Database['public']['Tables']['payment_records']['Update'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

// Extract enum types
export type UserRole = Database['public']['Enums']['user_role'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type DocumentCategory = Database['public']['Enums']['document_category'];
export type AiStatus = Database['public']['Enums']['ai_status'];
export type ApprovalStatus = Database['public']['Enums']['approval_status'];
export type SizeType = Database['public']['Enums']['size_type'];

// ============================================================================
// Complex Business Logic Types
// ============================================================================

// Size Configuration Types
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

// Payment Terms Types
export interface PaymentTerm {
  stage: 'advance' | 'release' | 'final' | 'other';
  percent: number;
  amount?: number;
  due_date?: string;
  paid?: boolean;
  paid_date?: string;
}

// AI Extracted Data Structure (from Gemini)
export interface AIExtractedData {
  // Common fields
  document_type?: string;
  document_number?: string;
  document_date?: string;
  
  // Invoice/Proforma specific
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  currency?: string;
  
  // Product information
  products?: Array<{
    name: string;
    variety?: string;
    quantity?: number;
    unit?: string;
    price_per_unit?: number;
    total?: number;
    size?: string;
  }>;
  
  // Shipping information
  container_number?: string;
  vessel_name?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  estimated_departure?: string;
  estimated_arrival?: string;
  
  // Packing list specific
  total_packages?: number;
  gross_weight?: number;
  net_weight?: number;
  
  // Parties
  supplier?: {
    name?: string;
    address?: string;
    tax_id?: string;
  };
  buyer?: {
    name?: string;
    address?: string;
    tax_id?: string;
  };
  
  // Additional metadata
  [key: string]: unknown;
}

// Validation Result Structure
export interface ValidationResult {
  overall_match: number; // 0-100
  discrepancies: Array<{
    field: string;
    expected: unknown;
    found: unknown;
    severity: 'critical' | 'warning' | 'info';
  }>;
  passed_checks: string[];
  failed_checks: string[];
  auto_approved: boolean;
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

// Order with related data
export interface OrderWithRelations extends Order {
  supplier?: Profile;
  importer?: Profile;
  broker?: Profile | null;
  documents?: Document[];
  payment_records?: PaymentRecord[];
}

// Document with related data
export interface DocumentWithRelations extends Document {
  order?: Order;
  uploader?: Profile;
  approved_by_user?: Profile | null;
}

// ============================================================================
// Form Types
// ============================================================================

// Order Form Data
export interface OrderFormData {
  // Basic info
  po_number?: string;
  order_date?: string;
  expected_delivery_date?: string;
  
  // Product details
  product_name: string;
  variety?: string;
  packaging?: string;
  kg_per_box?: number;
  hs_code?: string;
  
  // Size configuration
  size_type: 'uniform' | 'mixed';
  uniform_size?: string;
  uniform_quantity?: number;
  uniform_price?: number;
  mixed_sizes?: MixedSizeItem[];
  
  // Payment terms
  payment_terms: PaymentTerm[];
  
  // Shipping
  container_number?: string;
  shipping_line?: string;
  vessel_name?: string;
  estimated_arrival_date?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  
  // Financial
  total_quantity?: number;
  total_weight_kg?: number;
  total_amount?: number;
  currency?: string;
  
  // Notes
  notes?: string;
}

// Document Upload Form Data
export interface DocumentUploadFormData {
  order_id: string;
  category: DocumentCategory;
  file: File;
  notes?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ============================================================================
// Dashboard & Analytics Types
// ============================================================================

export interface OrderStats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  pending_documents: number;
  pending_payments: number;
  total_value: number;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  completed_orders: number;
  average_delivery_time: number; // in days
  on_time_delivery_rate: number; // percentage
  document_compliance_rate: number; // percentage
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link_url?: string;
  entity_type?: string;
  entity_id?: string;
}

// ============================================================================
// Filter & Search Types
// ============================================================================

export interface OrderFilters {
  status?: OrderStatus[];
  supplier_id?: string;
  importer_id?: string;
  broker_id?: string;
  product_name?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface DocumentFilters {
  order_id?: string;
  category?: DocumentCategory[];
  ai_status?: AiStatus[];
  approval_status?: ApprovalStatus[];
  uploader_id?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

export interface StatusBadgeProps {
  status: OrderStatus | ApprovalStatus | AiStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface DocumentViewerProps {
  document: Document;
  order: Order;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

// Make certain fields required
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make certain fields optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract non-null fields
export type NonNullableFields<T, K extends keyof T> = T & {
  [P in K]: NonNullable<T[P]>;
};

