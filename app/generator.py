import csv
from faker import Faker
import random

fake = Faker()


def generate_users(path, count):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["name", "email", "phone", "city", "created_at"])

        for _ in range(count):
            writer.writerow([
                fake.name(),
                fake.email(),
                fake.phone_number(),
                fake.city(),
                fake.date_this_year()
            ])


def generate_orders(path, count):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["order_id", "user_id", "date", "amount", "status"])

        for i in range(count):
            writer.writerow([
                i + 1,
                random.randint(1, 50),
                fake.date_this_year(),
                round(random.uniform(10, 500), 2),
                random.choice(["new", "paid", "cancelled"])
            ])