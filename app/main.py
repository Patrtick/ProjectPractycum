import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import os

from app.generator import generate_users, generate_orders
from app.anonymizer import anonymize_csv

app = FastAPI()

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.get("/")
def root():
    return {"message": "Backend is working"}


# Генерация

@app.get("/generate/users")
def generate_users_csv(count: int = 10):
    path = os.path.join(OUTPUT_DIR, "users.csv")
    generate_users(path, count)
    return FileResponse(path, filename="users.csv")


@app.get("/generate/orders")
def generate_orders_csv(count: int = 10):
    path = os.path.join(OUTPUT_DIR, "orders.csv")
    generate_orders(path, count)
    return FileResponse(path, filename="orders.csv")


# Анонимизация

@app.post("/anonymize")
async def anonymize(file: UploadFile = File(...), rules: str = Form("{}")):
    try:
        rules_dict = json.loads(rules)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON rules")

    input_path = os.path.join(OUTPUT_DIR, file.filename)

    with open(input_path, "wb") as f:
        f.write(await file.read())

    output_path = os.path.join(OUTPUT_DIR, "anonymized_" + file.filename)

    # Применение правил
    anonymize_csv(input_path, output_path, rules_dict)

    return FileResponse(output_path, filename="anonymized.csv")