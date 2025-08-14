# Database Migrations

This directory contains database migration scripts for the Telco Capability Analysis system.

## Recent Migrations

### Drop evidence_url Column Migration

**File:** `migrate_drop_evidence_url.py`

**Purpose:** Removes the `evidence_url` column from both `vendor_scores` and `process_vendor_scores` tables.

**Changes Made:**
- Removed `evidence_url` column from `VendorScore` model
- Removed `evidence_url` column from `ProcessVendorScore` model
- Updated all API endpoints to remove evidence_url references
- Updated frontend components to remove evidence_url handling
- Updated service layer to work with URLValidation records instead
- Created migration script to safely drop the columns

**To Run Migration:**
```bash
cd backend/migration
python migrate_drop_evidence_url.py
```

**Backup Recommendation:**
Before running this migration, it's recommended to backup your database:
```bash
# For SQLite
cp telco_analysis.db telco_analysis_backup.db

# For PostgreSQL
pg_dump your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Previous Migrations

### Vendor Scores Migration

**File:** `migrate_vendor_scores.py`

**Purpose:** Adds vendor_id column to vendor_scores table and updates references.

**To Run:**
```bash
python migrate_vendor_scores.py
```

### URL Validation Migration

**File:** `migrate_url_validation.py`

**Purpose:** Creates URLValidation table for tracking evidence URLs.

**To Run:**
```bash
python migrate_url_validation.py
```

## Migration Best Practices

1. **Always backup your database** before running migrations
2. **Test migrations** on a copy of your production data first
3. **Run migrations during maintenance windows** to minimize downtime
4. **Monitor migration progress** and check for any errors
5. **Verify data integrity** after migration completion

## Troubleshooting

If a migration fails:

1. Check the error message for specific issues
2. Verify database connectivity and permissions
3. Ensure all required dependencies are installed
4. Check if the migration has already been partially applied
5. Restore from backup if necessary and retry

For SQLite-specific issues:
- SQLite doesn't support DROP COLUMN directly, so some migrations recreate tables
- Ensure you have sufficient disk space for table recreation
- Consider using PostgreSQL for production environments 