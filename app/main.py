import json
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

from app.generator import generate_users, generate_orders, generate_custom_csv_string
from app.anonymizer import anonymize_csv

app = FastAPI()

# Настройка CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Модели для генерации
class GenerateRequest(BaseModel):
    template_id: str
    rows: int = Field(..., ge=1, le=10000)
    columns: List[str]

@app.get("/")
def root():
    return {"message": "Backend is working"}

# Новый эндпоинт для фронтенда
@app.post("/api/generate")
async def api_generate(request: GenerateRequest):
    try:
        csv_data = generate_custom_csv_string(
            template_id=request.template_id,
            columns=request.columns,
            count=request.rows
        )
        return {"csv": csv_data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# Старые эндпоинты генерации (через GET)

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
