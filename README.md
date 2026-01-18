# Kilo - Import Management Platform

A high-end B2B SaaS platform for fruit importers with AI-driven document validation and live import management.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **State Management:** TanStack Query (React Query)
- **Icons:** Lucide React
- **AI Processing:** Make.com + Google Gemini

## 📋 Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account
- Make.com account (for AI processing)

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your `Project URL` and `anon public` key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAKE_WEBHOOK_URL=your_make_webhook_url
```

### 4. Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `lib/supabase/schema.sql`
4. Click **Run** to execute the schema

This will create:
- ✅ All tables (profiles, orders, documents, payment_records, activity_log, notifications)
- ✅ Row Level Security (RLS) policies for all three user roles
- ✅ Database functions and triggers
- ✅ Indexes for optimal performance

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## 📊 Database Schema Overview

### Core Tables

1. **profiles** - User accounts with roles (importer, supplier, broker)
2. **orders** - Complete order lifecycle management
   - Product details (name, variety, packaging, HS code)
   - Complex JSONB fields for sizes and payment terms
   - Shipping information
3. **documents** - Document storage with AI processing
   - AI analysis results (`ai_data` JSONB column)
   - Validation and approval workflow
4. **payment_records** - Payment tracking
5. **activity_log** - Complete audit trail
6. **notifications** - In-app notification system

### User Roles & Permissions (RLS)

#### 🔵 Importer (Admin)
- Full access to all tables
- Can view, create, update, and delete all records
- Approves quotes and proformas

#### 🟢 Supplier
- Can only see their own orders and documents
- Can upload documents
- Cannot see other suppliers' data
- **Security:** `WHERE uploader_id = auth.uid()` enforced at database level

#### 🟡 Customs Broker
- Can view shipping documents for assigned orders
- Can upload broker invoices
- Limited access to specific document categories

## 🏗️ Project Structure

```
KILO/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   └── features/            # Feature-specific components
├── lib/
│   ├── supabase/
│   │   ├── schema.sql       # 🔴 MAIN DATABASE SCHEMA
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   ├── middleware.ts    # Auth middleware
│   │   └── database.types.ts # TypeScript types
│   └── utils.ts             # Utility functions
├── middleware.ts            # Next.js middleware for auth
└── .cursorrules             # AI coding assistant rules

```

## 🎨 UI/UX Guidelines

### Theme
- **Primary Color:** Purple (#6f42c1)
- **Design:** Professional, Clean, Desktop-first
- **Mobile:** Supplier-facing forms are mobile-optimized

### Status Colors
- 🟢 **Green/Teal** - Approved/Verified
- 🟡 **Amber** - Pending/Review Needed
- 🔴 **Red** - Rejected

### Split Screen Layout
Document review pages use a 50/50 split:
- **Left:** PDF Viewer
- **Right:** Data Form / AI Analysis

## 🤖 AI Document Processing Flow

1. **Upload:** User uploads document via UI
2. **Webhook:** File sent to Make.com webhook
3. **AI Analysis:** Make.com processes via Google Gemini
4. **Update:** Results written to `documents.ai_data` in Supabase
5. **Validation:** Frontend compares AI data vs order data
6. **Decision:** 
   - Match ≥ 98% → Auto-approved
   - Match < 98% → Review needed

## 📦 Order Lifecycle

1. **Quote Phase** → Supplier uploads quote → Importer approves
2. **Order Form** → Supplier fills structured form
3. **Proforma Phase** → AI validates → Importer approves
4. **Shipping Phase** → Required docs uploaded
5. **Release Phase** → Broker marks as released

## 🔐 Security Features

- Row Level Security (RLS) enforced at database level
- Server-side authentication with Supabase Auth
- Middleware-based session management
- Role-based access control
- Complete audit trail in `activity_log`

## 📝 Next Steps

After setup, you can:
1. Create user authentication pages (`/app/login`, `/app/signup`)
2. Build the orders dashboard
3. Implement document upload with AI processing
4. Create the split-screen document review interface
5. Add real-time notifications using Supabase Realtime

## 🤝 Contributing

This is a private B2B SaaS project. Follow the coding standards in `.cursorrules`.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using Next.js 15 + Supabase**

