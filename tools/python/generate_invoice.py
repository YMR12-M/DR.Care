#!/usr/bin/env python3
"""Generate a printable invoice from DR.Care booking data."""

import argparse
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parents[2] / 'data' / 'drcare.db'

INVOICE_TEMPLATE = '''DR.Care - فاتورة خدمة
رقم الفاتورة: {id}
التاريخ: {created}

اسم العميل: {name}
رقم اللوحة: {plate}
الهاتف: {phone}
الفرع: {branch}
نوع السيارة: {car_type}
طريقة الدفع: {payment_method}

الخدمة: {package}
السعر الأساسي: {price} جنيه
رسوم نوع السيارة: {car_extra} جنيه
المجموع النهائي: {total} جنيه

ملاحظات:
{notes}

شكراً لاستخدام DR.Care
'''

PACKAGE_PRICES = {
    'quick': 150,
    'full': 280,
    'detail': 650,
    'fleet': 0,
}

CAR_EXTRAS = {
    'sedan': 0,
    'suv': 60,
    'van': 90,
    'pickup': 120,
}

def fetch_booking(booking_id: int):
    if not DB_PATH.exists():
        raise FileNotFoundError(f'Database not found: {DB_PATH}')

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
    row = cursor.fetchone()
    conn.close()
    return row


def render_invoice(row):
    if row is None:
        raise ValueError('Booking not found')

    package_code = row['package_code'] or 'quick'
    car_type_code = row['car_type_code'] or 'sedan'
    price = PACKAGE_PRICES.get(package_code, 0)
    car_extra = CAR_EXTRAS.get(car_type_code, 0)
    total = price + car_extra

    created = row['created_at'] or datetime.now().isoformat()
    notes = row['notes'] or 'لا توجد'

    return INVOICE_TEMPLATE.format(
        id=row['id'],
        created=created,
        name=row['name'],
        plate=row['plate_number'] or '-',
        phone=row['phone'] or '-',
        branch=row['branch'] or '-',
        car_type=row['car_type_name'] or car_type_code,
        payment_method=row['payment_method'] or '-',
        package=row['package_name'] or package_code,
        price=price,
        car_extra=car_extra,
        total=total,
        notes=notes,
    )


def main():
    parser = argparse.ArgumentParser(description='Generate a printable invoice for DR.Care booking.')
    parser.add_argument('id', type=int, help='Booking ID')
    parser.add_argument('--out', '-o', default=None, help='Output file path')
    args = parser.parse_args()

    row = fetch_booking(args.id)
    invoice = render_invoice(row)
    output_file = Path(args.out) if args.out else Path(f'invoice_{args.id}.txt')
    output_file.write_text(invoice, encoding='utf-8')
    print(f'Invoice saved to: {output_file.resolve()}')


if __name__ == '__main__':
    main()
