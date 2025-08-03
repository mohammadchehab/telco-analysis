# Migration Scripts

This directory contains all database migration and initialization scripts for the Telco Analysis application.

## Scripts Overview

### PostgreSQL Migration
- **`deploy_postgresql.sh`** - Main deployment script for PostgreSQL migration
- **`init_postgresql.py`** - Initialize PostgreSQL database with tables
- **`migrate_to_postgresql.py`** - Migrate data from SQLite to PostgreSQL

### Database Maintenance
- **`migrate_db.py`** - General database migration script
- **`migrate_uploads.py`** - Migrate upload data
- **`migrate_url_validation.py`** - Migrate URL validation data
- **`migrate_pinned_menu.py`** - Migrate pinned menu preferences
- **`init_tmf_processes.py`** - Initialize TMF Business Process Framework

## Usage

### PostgreSQL Migration
```bash
cd backend/migration
./deploy_postgresql.sh
```

### Individual Scripts
```bash
# Initialize PostgreSQL
python init_postgresql.py

# Migrate data
python migrate_to_postgresql.py

# Other migrations
python migrate_db.py
python migrate_uploads.py
python migrate_url_validation.py
python migrate_pinned_menu.py
python init_tmf_processes.py
```

## Prerequisites

1. PostgreSQL server running on `172.16.14.112:5432`
2. Database `telco_analysis` created
3. User `postgres` with password `postgres` has access
4. Python dependencies installed (`psycopg2-binary`)

## Configuration

All scripts use the `DATABASE_URL` from `../config.env`:
```
DATABASE_URL=postgresql://postgres:postgres@172.16.14.112:5432/telco_analysis
```

## Rollback

To rollback to SQLite:
1. Change `DATABASE_URL` in `../config.env` back to `sqlite:///telco_analysis.db`
2. Restart the application 