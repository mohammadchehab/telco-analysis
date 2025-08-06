#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '..')

from core.database import SessionLocal
from models.models import Capability

db = SessionLocal()
cap = db.query(Capability).filter(Capability.id == 8).first()
if cap:
    print(f"Capability 8: {cap.name}")
else:
    print("Capability 8: Not found")
db.close() 