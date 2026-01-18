-- ============================================================================
-- KILO - Database Schema
-- B2B SaaS for Fruit Importers with AI-driven Document Validation
-- ============================================================================
-- This schema supports:
-- 1. Three user roles: Importer (Admin), Supplier, Customs Broker
-- 2. Complete order lifecycle from Quote to Release
-- 3. AI-powered document processing via Make.com/Gemini
-- 4. Strict Row Level Security (RLS) policies
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User role types
CREATE TYPE user_role AS ENUM ('importer', 'supplier', 'broker');

-- Order status types (lifecycle phases)
CREATE TYPE order_status AS ENUM (
  'draft',
  'quote_pending',
  'quote_approved',
  'order_confirmed',
  'proforma_pending',
  'proforma_approved',
  'payment_pending',
  'shipped',
  'customs_clearance',
  'released',
  'completed',
  'cancelled'
);

-- Document category types
CREATE TYPE document_category AS ENUM (
  'quote',
  'proforma_invoice',
  'commercial_invoice',
  'packing_list',
  'phytosanitary_certificate',
  'bill_of_lading',
  'euro1_certificate',
  'broker_invoice',
  'other'
);

-- AI processing status
CREATE TYPE ai_status AS ENUM ('pending', 'processing', 'success', 'failed');

-- Document approval status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'review_needed');

-- Size configuration type
CREATE TYPE size_type AS ENUM ('uniform', 'mixed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Extended user profiles linked to Supabase Auth
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  company_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ----------------------------------------------------------------------------
-- 2. ORDERS TABLE
-- Core business entity: stores order information and complex product details
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status tracking
  status order_status NOT NULL DEFAULT 'draft',
  
  -- Basic order info
  po_number TEXT UNIQUE,
  order_date DATE,
  expected_delivery_date DATE,
  
  -- Product information
  product_name TEXT NOT NULL,
  variety TEXT,
  packaging TEXT, -- e.g., "Carton", "Box"
  kg_per_box NUMERIC(10, 2),
  hs_code TEXT, -- Harmonized System Code for customs
  
  -- Complex fields stored as JSONB
  -- sizes_json structure:
  -- For uniform: {"type": "uniform", "size": "18", "quantity": 1000, "price_per_unit": 2.5}
  -- For mixed: {"type": "mixed", "items": [{"size": "18", "quantity": 500, "price_per_unit": 2.5}, {"size": "22", "quantity": 500, "price_per_unit": 2.3}]}
  sizes_json JSONB NOT NULL DEFAULT '{"type": "uniform"}'::jsonb,
  
  -- payment_terms_json structure:
  -- [{"stage": "advance", "percent": 20, "amount": 5000, "due_date": "2024-01-15"}, {"stage": "release", "percent": 80, "amount": 20000}]
  payment_terms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Shipping information
  container_number TEXT,
  shipping_line TEXT,
  vessel_name TEXT,
  estimated_arrival_date DATE,
  actual_arrival_date DATE,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  
  -- Financial totals
  total_quantity NUMERIC(10, 2),
  total_weight_kg NUMERIC(10, 2),
  total_amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Relationships
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  importer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Additional notes
  notes TEXT,
  internal_notes TEXT -- Only visible to importer
);

-- Indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_importer_id ON orders(importer_id);
CREATE INDEX idx_orders_broker_id ON orders(broker_id);
CREATE INDEX idx_orders_po_number ON orders(po_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Full-text search on product information
CREATE INDEX idx_orders_product_search ON orders 
  USING gin(to_tsvector('english', product_name || ' ' || COALESCE(variety, '')));

-- ----------------------------------------------------------------------------
-- 3. DOCUMENTS TABLE
-- Stores all documents with AI processing capabilities
-- ----------------------------------------------------------------------------
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Document information
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category document_category NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- AI Processing (Make.com + Gemini integration)
  ai_status ai_status NOT NULL DEFAULT 'pending',
  ai_data JSONB, -- Stores extracted data from Gemini
  ai_confidence_score NUMERIC(5, 2), -- 0-100
  ai_processed_at TIMESTAMPTZ,
  ai_error_message TEXT,
  
  -- Validation & Approval
  approval_status approval_status NOT NULL DEFAULT 'pending',
  validation_result JSONB, -- Comparison results vs order data
  match_percentage NUMERIC(5, 2), -- 0-100
  
  -- Approval workflow
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- Upload tracking
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  replaces_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Additional metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_documents_order_id ON documents(order_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_ai_status ON documents(ai_status);
CREATE INDEX idx_documents_approval_status ON documents(approval_status);
CREATE INDEX idx_documents_uploader_id ON documents(uploader_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- GIN index for AI data JSONB queries
CREATE INDEX idx_documents_ai_data ON documents USING gin(ai_data);
CREATE INDEX idx_documents_validation_result ON documents USING gin(validation_result);

-- ----------------------------------------------------------------------------
-- 4. PAYMENT_RECORDS TABLE
-- Tracks actual payments against payment terms
-- ----------------------------------------------------------------------------
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Payment details
  stage TEXT NOT NULL, -- 'advance', 'release', 'final', etc.
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_date DATE NOT NULL,
  
  -- Payment method
  payment_method TEXT, -- 'wire_transfer', 'letter_of_credit', etc.
  reference_number TEXT,
  
  -- Documentation
  proof_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Tracking
  recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  notes TEXT
);

CREATE INDEX idx_payment_records_order_id ON payment_records(order_id);
CREATE INDEX idx_payment_records_payment_date ON payment_records(payment_date DESC);

-- ----------------------------------------------------------------------------
-- 5. ACTIVITY_LOG TABLE
-- Audit trail for all important actions
-- ----------------------------------------------------------------------------
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Action details
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'order_created', 'document_uploaded', 'status_changed', etc.
  entity_type TEXT NOT NULL, -- 'order', 'document', 'payment', etc.
  entity_id UUID NOT NULL,
  
  -- Context
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- IP and user agent for security
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE
-- In-app notifications for users
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'success', 'error'
  
  -- Link to related entity
  link_url TEXT,
  entity_type TEXT,
  entity_id UUID,
  
  -- Status
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'supplier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Importers can see all profiles
CREATE POLICY "Importers can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- Suppliers can only see their own profile and importer profiles
CREATE POLICY "Suppliers can view own and importer profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR role = 'importer'
    OR (
      role = 'supplier' AND id = auth.uid()
    )
  );

-- Brokers can see their own profile and importer profiles
CREATE POLICY "Brokers can view own and importer profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR role = 'importer'
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only importers can insert profiles (admin function)
CREATE POLICY "Importers can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- ----------------------------------------------------------------------------
-- ORDERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Importers can do anything with orders
CREATE POLICY "Importers have full access to orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- Suppliers can view and update their own orders
CREATE POLICY "Suppliers can view own orders"
  ON orders FOR SELECT
  USING (
    supplier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

CREATE POLICY "Suppliers can update own orders"
  ON orders FOR UPDATE
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Suppliers can insert orders"
  ON orders FOR INSERT
  WITH CHECK (supplier_id = auth.uid());

-- Brokers can view orders assigned to them
CREATE POLICY "Brokers can view assigned orders"
  ON orders FOR SELECT
  USING (
    broker_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

CREATE POLICY "Brokers can update assigned orders"
  ON orders FOR UPDATE
  USING (broker_id = auth.uid())
  WITH CHECK (broker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- DOCUMENTS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Importers can do anything with documents
CREATE POLICY "Importers have full access to documents"
  ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- Suppliers can view and create their own documents
CREATE POLICY "Suppliers can view own documents"
  ON documents FOR SELECT
  USING (
    uploader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = documents.order_id AND o.supplier_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

CREATE POLICY "Suppliers can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "Suppliers can update own documents"
  ON documents FOR UPDATE
  USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid());

-- Brokers can view shipping documents
CREATE POLICY "Brokers can view shipping documents"
  ON documents FOR SELECT
  USING (
    category IN ('commercial_invoice', 'packing_list', 'bill_of_lading', 'phytosanitary_certificate')
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = documents.order_id 
      AND o.broker_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

CREATE POLICY "Brokers can insert broker documents"
  ON documents FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND category = 'broker_invoice'
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.broker_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PAYMENT_RECORDS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Importers have full access
CREATE POLICY "Importers have full access to payments"
  ON payment_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- Suppliers can view payments for their orders
CREATE POLICY "Suppliers can view own order payments"
  ON payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payment_records.order_id AND o.supplier_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- ----------------------------------------------------------------------------
-- ACTIVITY_LOG TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Importers can view all activity
CREATE POLICY "Importers can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'importer'
    )
  );

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (user_id = auth.uid());

-- All authenticated users can insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate order totals based on sizes_json
CREATE OR REPLACE FUNCTION calculate_order_totals(sizes JSONB)
RETURNS TABLE (total_qty NUMERIC, total_amount NUMERIC) AS $$
BEGIN
  IF sizes->>'type' = 'uniform' THEN
    RETURN QUERY SELECT 
      (sizes->>'quantity')::NUMERIC,
      ((sizes->>'quantity')::NUMERIC * (sizes->>'price_per_unit')::NUMERIC);
  ELSE
    RETURN QUERY SELECT 
      SUM((item->>'quantity')::NUMERIC),
      SUM((item->>'quantity')::NUMERIC * (item->>'price_per_unit')::NUMERIC)
    FROM jsonb_array_elements(sizes->'items') AS item;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if document validation passes threshold
CREATE OR REPLACE FUNCTION is_auto_approved(match_pct NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN match_pct >= 98.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create activity log entry
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    metadata
  )
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_value,
    p_new_value,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link_url,
    entity_type,
    entity_id
  )
  VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_link_url,
    p_entity_type,
    p_entity_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR JSONB QUERIES
-- ============================================================================

-- Optimize queries on sizes_json
CREATE INDEX idx_orders_sizes_type ON orders ((sizes_json->>'type'));

-- Optimize queries on payment_terms_json
CREATE INDEX idx_orders_payment_terms ON orders USING gin(payment_terms_json);

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - COMMENT OUT FOR PRODUCTION)
-- ============================================================================

-- Uncomment below to insert sample data for testing

/*
-- Sample Importer User
INSERT INTO profiles (id, email, full_name, role, company_name)
VALUES (
  gen_random_uuid(),
  'admin@kilo.com',
  'John Admin',
  'importer',
  'Kilo Imports Ltd.'
);

-- Sample Supplier User
INSERT INTO profiles (id, email, full_name, role, company_name)
VALUES (
  gen_random_uuid(),
  'supplier@fruits.com',
  'Maria Supplier',
  'supplier',
  'Fresh Fruits Export SA'
);

-- Sample Broker User
INSERT INTO profiles (id, email, full_name, role, company_name)
VALUES (
  gen_random_uuid(),
  'broker@customs.com',
  'David Broker',
  'broker',
  'Express Customs Services'
);
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Kilo database schema created successfully!';
  RAISE NOTICE 'Tables created: profiles, orders, documents, payment_records, activity_log, notifications';
  RAISE NOTICE 'RLS policies enabled for all roles: importer, supplier, broker';
  RAISE NOTICE 'Ready for production use.';
END $$;

