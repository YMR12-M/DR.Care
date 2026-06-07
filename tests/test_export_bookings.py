#!/usr/bin/env python3
"""Tests for export_bookings.py"""

import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import export_bookings as exporter  # noqa: E402


class ExportBookingsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.db_path = Path(self.tmp.name)
        self.tmp.close()

        conn = sqlite3.connect(self.db_path)
        conn.execute(
            '''CREATE TABLE bookings (
                id INTEGER PRIMARY KEY,
                name TEXT, email TEXT, phone TEXT,
                package_name TEXT, car_type_name TEXT, branch TEXT,
                total_price REAL, created_at TEXT, status TEXT,
                appointment TEXT, plate_number TEXT, notes TEXT
            )'''
        )
        conn.execute(
            '''INSERT INTO bookings VALUES
            (1, 'Test User', 't@example.com', '01012345678',
             'Full Care', 'SUV', 'مدينة نصر', 340, '2026-01-01T10:00:00',
             'new', '2026-01-02T12:00', 'ABC 123', 'note')'''
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        if self.db_path.exists():
            self.db_path.unlink()

    def test_export_writes_csv(self):
        out = Path(tempfile.gettempdir()) / 'drcare-export-test.csv'
        try:
            code = exporter.export(out, self.db_path)
            self.assertEqual(code, 0)
            self.assertTrue(out.exists())

            with out.open(encoding='utf-8') as f:
                rows = list(csv.reader(f))

            self.assertEqual(len(rows), 2)
            self.assertIn('name', rows[0])
            self.assertEqual(rows[1][1], 'Test User')
        finally:
            if out.exists():
                out.unlink()

    def test_export_missing_db_returns_error(self):
        missing = Path(tempfile.gettempdir()) / 'missing-drcare.db'
        code = exporter.export(Path(tempfile.gettempdir()) / 'out.csv', missing)
        self.assertEqual(code, 1)


if __name__ == '__main__':
    unittest.main()
