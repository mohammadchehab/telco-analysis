#!/bin/bash

echo "🚀 Starting PostgreSQL Migration..."

# Install PostgreSQL driver
echo "📦 Installing PostgreSQL driver..."
pip install psycopg2-binary>=2.9.0

# Test PostgreSQL connection
echo "🔍 Testing PostgreSQL connection..."
python -c "
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
load_dotenv('config.env')
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print('✅ PostgreSQL connection successful')
"

if [ $? -ne 0 ]; then
    echo "❌ PostgreSQL connection failed"
    exit 1
fi

# Initialize PostgreSQL database
echo "🗄️ Initializing PostgreSQL database..."
python init_postgresql.py

if [ $? -ne 0 ]; then
    echo "❌ PostgreSQL initialization failed"
    exit 1
fi

# Migrate data from SQLite
echo "📊 Migrating data from SQLite..."
python migrate_to_postgresql.py

if [ $? -ne 0 ]; then
    echo "❌ Data migration failed"
    exit 1
fi

echo "🎉 PostgreSQL migration completed successfully!"
echo "💡 You can now remove the SQLite database file if needed"
echo "🔧 Update your deployment scripts to use PostgreSQL" 