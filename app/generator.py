import csv
import io
import random
from faker import Faker

fake = Faker()

# Маппинг полей к функциям генерации
FIELDS_MAP = {
    "users": {
        "full_name": lambda i: fake.name(),
        "email": lambda i: fake.email(),
        "phone": lambda i: fake.phone_number(),
        "city": lambda i: fake.city(),
        "registration_date": lambda i: fake.date_this_year().isoformat(),
    },
    "orders": {
        "order_id": lambda i: i + 1,
        "user_id": lambda i: random.randint(1, 100),
        "date": lambda i: fake.date_this_year().isoformat(),
        "amount": lambda i: round(random.uniform(10, 1000), 2),
        "status": lambda i: random.choice(["new", "paid", "cancelled", "shipped"]),
    }
}

def generate_custom_csv_string(template_id: str, columns: list, count: int) -> str:
    if template_id not in FIELDS_MAP:
        raise ValueError(f"Unknown template_id: {template_id}")

    template_fields = FIELDS_MAP[template_id]
    
    # Фильтруем только существующие колонки
    valid_columns = [col for col in columns if col in template_fields]
    if not valid_columns:
        valid_columns = list(template_fields.keys())

    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=valid_columns)
    writer.writeheader()

    for i in range(count):
        row = {col: template_fields[col](i) for col in valid_columns}
        writer.writerow(row)

    return output.getvalue()

# Старые функции для обратной совместимости (если нужны)
def generate_users(path, count):
    columns = ["full_name", "email", "phone", "city", "registration_date"]
    csv_data = generate_custom_csv_string("users", columns, count)
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(csv_data)

def generate_orders(path, count):
    columns = ["order_id", "user_id", "date", "amount", "status"]
    csv_data = generate_custom_csv_string("orders", columns, count)
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(csv_data)
