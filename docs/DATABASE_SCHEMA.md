# 🗄️ Kilo Database Schema - Quick Reference

## Tables Overview

### 1. profiles
**Purpose:** User accounts with role-based access

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (linked to auth.users) |
| email | text | User email (unique) |
| full_name | text | Display name |
| role | enum | 'importer', 'supplier', 'broker' |
| company_name | text | Company name (nullable) |

**RLS:**
- Importers: See all
- Suppliers: See own + importers
- Brokers: See own + importers

---

### 2. orders
**Purpose:** Core business entity for import orders

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| status | enum | Order lifecycle state (12 states) |
| po_number | text | Purchase order number (unique) |
| product_name | text | Product name (e.g., "Kiwi") |
| variety | text | Product variety (e.g., "Hayward") |
| **sizes_json** | **jsonb** | **Uniform or Mixed size config** |
| **payment_terms_json** | **jsonb** | **Payment split configuration** |
| supplier_id | uuid | Foreign key → profiles |
| importer_id | uuid | Foreign key → profiles |
| broker_id | uuid | Foreign key → profiles (nullable) |

**sizes_json Examples:**
```json
// Uniform
{
  "type": "uniform",
  "size": "18",
  "quantity": 1000,
  "price_per_unit": 2.5
}

// Mixed
{
  "type": "mixed",
  "items": [
    {"size": "18", "quantity": 500, "price_per_unit": 2.5},
    {"size": "22", "quantity": 500, "price_per_unit": 2.3}
  ]
}
```

**payment_terms_json Example:**
```json
[
  {"stage": "advance", "percent": 20, "amount": 5000},
  {"stage": "release", "percent": 80, "amount": 20000}
]
```

**RLS:**
- Importers: Full access
- Suppliers: Own orders only (supplier_id = auth.uid())
- Brokers: Assigned orders only (broker_id = auth.uid())

---

### 3. documents
**Purpose:** Document storage with AI processing

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | Foreign key → orders |
| category | enum | Document type (9 categories) |
| file_url | text | Supabase Storage URL |
| **ai_status** | **enum** | **'pending', 'processing', 'success', 'failed'** |
| **ai_data** | **jsonb** | **Gemini extracted data** |
| ai_confidence_score | numeric | 0-100 |
| approval_status | enum | 'pending', 'approved', 'rejected', 'review_needed' |
| validation_result | jsonb | Comparison results |
| match_percentage | numeric | 0-100 |
| uploader_id | uuid | Foreign key → profiles |

**Document Categories:**
1. `quote`
2. `proforma_invoice`
3. `commercial_invoice`
4. `packing_list`
5. `phytosanitary_certificate`
6. `bill_of_lading`
7. `euro1_certificate`
8. `broker_invoice`
9. `other`

**RLS:**
- Importers: Full access
- Suppliers: Own documents only (uploader_id = auth.uid())
- Brokers: Shipping docs only (specific categories + broker_id match)

---

### 4. payment_records
**Purpose:** Track actual payments

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | Foreign key → orders |
| stage | text | Payment stage ('advance', 'release', etc.) |
| amount | numeric | Payment amount |
| payment_date | date | When paid |
| recorded_by | uuid | Foreign key → profiles |

**RLS:**
- Importers: Full access
- Suppliers: View payments for own orders

---

### 5. activity_log
**Purpose:** Audit trail

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Who did the action |
| action | text | Action name |
| entity_type | text | 'order', 'document', etc. |
| entity_id | uuid | ID of affected entity |
| old_value | jsonb | Previous state |
| new_value | jsonb | New state |

**RLS:**
- Importers: View all
- Others: View own activity

---

### 6. notifications
**Purpose:** In-app notifications

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Recipient |
| title | text | Notification title |
| message | text | Notification body |
| type | text | 'info', 'success', 'warning', 'error' |
| read | boolean | Read status |

**RLS:**
- Users: Own notifications only

---

## Order Status Flow

```
draft
  ↓ Supplier uploads quote
quote_pending
  ↓ Importer approves
quote_approved
  ↓ Supplier fills order form
order_confirmed
  ↓ Supplier uploads proforma
proforma_pending
  ↓ AI validates + Importer approves
proforma_approved
  ↓ Payment initiated
payment_pending
  ↓ Payment confirmed + docs uploaded
shipped
  ↓ Arrives at port
customs_clearance
  ↓ Broker marks released
released
  ↓ Final confirmation
completed
```

---

## Useful SQL Functions

### 1. Calculate Order Totals
```sql
SELECT * FROM calculate_order_totals(
  '{"type": "uniform", "size": "18", "quantity": 1000, "price_per_unit": 2.5}'::jsonb
);
-- Returns: total_qty: 1000, total_amount: 2500
```

### 2. Check Auto-Approval
```sql
SELECT is_auto_approved(99.5);
-- Returns: true (≥98% = auto-approved)
```

### 3. Log Activity
```sql
SELECT log_activity(
  'order_created',
  'order',
  'uuid-of-order',
  NULL,
  '{"status": "draft"}'::jsonb
);
```

### 4. Create Notification
```sql
SELECT create_notification(
  'user-uuid',
  'Document Uploaded',
  'New proforma invoice uploaded',
  'info',
  '/orders/123'
);
```

---

## RLS Policy Summary

| Role | Profiles | Orders | Documents | Payments |
|------|----------|--------|-----------|----------|
| **Importer** | All | All | All | All |
| **Supplier** | Own + Importers | Own only | Own only | View own |
| **Broker** | Own + Importers | Assigned | Shipping docs | None |

---

## Indexes Created

**Performance optimized for:**
- ✅ Order filtering by status, supplier, importer, date
- ✅ Document filtering by category, AI status, approval status
- ✅ Full-text search on product names
- ✅ JSONB queries on ai_data, sizes_json, payment_terms_json

---

## Triggers

1. **update_updated_at_column** - Auto-updates `updated_at` on all tables
2. **handle_new_user** - Auto-creates profile when user signs up

---

## Quick Queries

### Get all orders for a supplier
```sql
SELECT * FROM orders
WHERE supplier_id = auth.uid()
ORDER BY created_at DESC;
```

### Get pending documents for an order
```sql
SELECT * FROM documents
WHERE order_id = 'order-uuid'
  AND approval_status = 'pending'
  AND ai_status = 'success';
```

### Get unread notifications
```sql
SELECT * FROM notifications
WHERE user_id = auth.uid()
  AND read = false
ORDER BY created_at DESC;
```

---

**For full schema:** See `lib/supabase/schema.sql` (800+ lines)

