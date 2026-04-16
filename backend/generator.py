import csv
import io
import os
import random
from faker import Faker

fake = Faker('ru_RU')

# Маппинг полей к функциям генерации
FIELDS_MAP = {
    "users": {
        "full_name": lambda i: fake.name(),
        "email": lambda i: fake.email(),
        "phone": lambda i: fake.numerify("+7 (###) ###-##-##"),
        "city": lambda i: fake.city(),
        "registration_date": lambda i: fake.date_this_year().strftime("%d.%m.%Y"),
    },
    "orders": {
        "order_id": lambda i: i + 1,
        "user_id": lambda i: random.randint(1, 100),
        "date": lambda i: fake.date_this_year().strftime("%d.%m.%Y"),
        "amount": lambda i: round(random.uniform(10, 1000), 2),
        "status": lambda i: random.choice(["new", "paid", "cancelled", "shipped"]),
    }
}


def generate_custom_csv_file(template_id: str, columns: list, count: int, output_path: str):
    if template_id not in FIELDS_MAP:
        raise ValueError(f"Unknown template_id: {template_id}")

    template_fields = FIELDS_MAP[template_id]

    # Фильтруем только существующие колонки
    valid_columns = [col for col in columns if col in template_fields]
    if not valid_columns:
        valid_columns = list(template_fields.keys())

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=valid_columns)
        writer.writeheader()

        for i in range(count):
            row = {col: template_fields[col](i) for col in valid_columns}
            writer.writerow(row)


def generate_custom_csv_string(template_id: str, columns: list, count: int) -> str:
    if template_id not in FIELDS_MAP:
        raise ValueError(f"Unknown template_id: {template_id}")

    template_fields = FIELDS_MAP[template_id]

    # Фильтруем только существующие колонки
    valid_columns = [col for col in columns if col in template_fields]
    if not valid_columns:
        valid_columns = list(template_fields.keys())

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=valid_columns)
    writer.writeheader()

    for i in range(count):
        row = {col: template_fields[col](i) for col in valid_columns}
        writer.writerow(row)

    return output.getvalue()


# Старые функции для обратной совместимости
def generate_users(path, count):
    columns = ["full_name", "email", "phone", "city", "registration_date"]
    generate_custom_csv_file("users", columns, count, path)


def generate_orders(path, count):
    columns = ["order_id", "user_id", "date", "amount", "status"]
    generate_custom_csv_file("orders", columns, count, path)