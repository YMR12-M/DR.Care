#!/usr/bin/env python3
"""Export bookings from SQLite to CSV.
Usage: python3 export_bookings.py --out out.csv
"""
import sqlite3
import csv
import argparse
from pathlib import Path

DB = Path(__file__).resolve().parents[2] / 'data' / 'drcare.db'

def export(out_path: Path, db_path: Path | None = None):
    db = db_path or DB
    if not db.exists():
        print('DB not found:', db)
        return 1
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute('SELECT id,name,email,phone,package_name,car_type_name,branch,total_price,created_at,status,appointment,plate_number,notes FROM bookings ORDER BY id DESC')
    rows = cur.fetchall()
    headers = [d[0] for d in cur.description]
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f'Exported {len(rows)} bookings to {out_path}')
    return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', '-o', default='bookings_export.csv')
    parser.add_argument('--db', default=None, help='Optional SQLite database path')
    args = parser.parse_args()
    db_path = Path(args.db) if args.db else None
    return export(Path(args.out), db_path)

if __name__ == '__main__':
    raise SystemExit(main())
