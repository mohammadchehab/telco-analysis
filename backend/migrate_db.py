#!/usr/bin/env python3
"""
Database migration script to update vendor_scores table schema
"""
import sqlite3
from pathlib import Path

def migrate_vendor_scores():
    """Migrate vendor_scores table to new schema"""
    db_path = Path("telco_analysis.db")
    
    if not db_path.exists():
        print("❌ Database file not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting vendor_scores table migration...")
        
        # Check if migration is needed
        cursor.execute("PRAGMA table_info(vendor_scores)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'capability_id' in columns and 'attribute_id' in columns:
            print("✅ Migration already completed")
            return
        
        print("📋 Current columns:", columns)
        
        # Create new table with correct schema
        cursor.execute("""
            CREATE TABLE vendor_scores_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                capability_id INTEGER NOT NULL,
                attribute_id INTEGER NOT NULL,
                vendor TEXT NOT NULL,
                weight INTEGER DEFAULT 50,
                score TEXT NOT NULL,
                score_numeric REAL NOT NULL,
                observation TEXT,
                evidence_url TEXT,
                score_decision TEXT,
                research_type TEXT DEFAULT 'capability_research',
                research_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (capability_id) REFERENCES capabilities (id),
                FOREIGN KEY (attribute_id) REFERENCES attributes (id)
            )
        """)
        
        # Migrate existing data
        print("🔄 Migrating existing data...")
        
        # Get all capabilities for name-to-id mapping
        cursor.execute("SELECT id, name FROM capabilities")
        capability_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        # Get all attributes for name-to-id mapping
        cursor.execute("SELECT id, attribute_name, capability_id FROM attributes")
        attribute_map = {}
        for row in cursor.fetchall():
            attr_id, attr_name, cap_id = row
            key = (cap_id, attr_name)
            attribute_map[key] = attr_id
        
        # Migrate vendor scores
        cursor.execute("SELECT * FROM vendor_scores")
        old_records = cursor.fetchall()
        
        migrated_count = 0
        skipped_count = 0
        
        for record in old_records:
            try:
                # Extract old data
                (id, capability_name, attribute_name, vendor, weight, score, 
                 score_numeric, observation, evidence_url, score_decision, 
                 research_type, created_at) = record
                
                # Find capability_id
                capability_id = capability_map.get(capability_name)
                if not capability_id:
                    print(f"⚠️ Skipping record {id}: Capability '{capability_name}' not found")
                    skipped_count += 1
                    continue
                
                # Find attribute_id
                attribute_id = attribute_map.get((capability_id, attribute_name))
                if not attribute_id:
                    print(f"⚠️ Skipping record {id}: Attribute '{attribute_name}' not found for capability {capability_id}")
                    skipped_count += 1
                    continue
                
                # Insert into new table
                cursor.execute("""
                    INSERT INTO vendor_scores_new (
                        capability_id, attribute_id, vendor, weight, score, 
                        score_numeric, observation, evidence_url, score_decision, 
                        research_type, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    capability_id, attribute_id, vendor, weight, score,
                    score_numeric, observation, evidence_url, score_decision,
                    research_type, created_at
                ))
                
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Error migrating record {id}: {e}")
                skipped_count += 1
        
        # Drop old table and rename new table
        cursor.execute("DROP TABLE vendor_scores")
        cursor.execute("ALTER TABLE vendor_scores_new RENAME TO vendor_scores")
        
        # Create indexes
        cursor.execute("CREATE INDEX idx_vendor_scores_capability_id ON vendor_scores(capability_id)")
        cursor.execute("CREATE INDEX idx_vendor_scores_attribute_id ON vendor_scores(attribute_id)")
        
        conn.commit()
        
        print(f"✅ Migration completed successfully!")
        print(f"📊 Migrated: {migrated_count} records")
        print(f"⚠️ Skipped: {skipped_count} records")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_vendor_scores() 