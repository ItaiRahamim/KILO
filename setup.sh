# Kilo Setup Script
# Run this after creating your .env.local file

echo "🚀 Starting Kilo Setup..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠️  .env.local not found!"
  echo "📝 Creating .env.local from template..."
  cp .env.example .env.local
  echo "✅ Created .env.local - Please update with your Supabase credentials"
  echo ""
  echo "Required variables:"
  echo "  - NEXT_PUBLIC_SUPABASE_URL"
  echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  - NEXT_PUBLIC_MAKE_WEBHOOK_URL"
  echo ""
  exit 1
fi

echo "✅ Environment variables found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of lib/supabase/schema.sql"
echo "4. Click 'Run' to create all tables and policies"
echo "5. Run 'npm run dev' to start the development server"
echo ""
echo "🎉 Happy coding!"

