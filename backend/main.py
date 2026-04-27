import json
import os
import csv
import sys
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

# Добавляем текущую директорию в пути поиска, чтобы импорты работали наверняка
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from generator import generate_custom_csv_file
    from anonymizer import anonymize_csv
except ImportError as e:
    print(f"CRITICAL ERROR: Could not import modules. {e}")
    # Выводим список файлов для отладки в логах docker
    print("Files in current directory:")
    print(os.listdir('.'))
    raise e

app = FastAPI()

# Разрешаем все источники (для разработки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://2.26.8.117:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Путь для сохранения файлов внутри контейнера
OUTPUT_DIR = "/app/output"

@app.on_event("startup")
def startup_event():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"✅ Backend started. Output dir: {OUTPUT_DIR}")
    print(f"📁 Files in output dir: {os.listdir(OUTPUT_DIR)}")

class GenerateRequest(BaseModel):
    template_id: str
    rows: int = Field(..., ge=1, le=10000)
    columns: List[str]

@app.get("/")
def root():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/api/anonymize/methods")
async def get_methods():
    return {
        "methods": [
            {"id": "mask", "label": "Маскирование", "description": "Заменяет часть данных на *", "example": "i***@mail.ru", "parameters": []},
            {"id": "redact", "label": "Удаление", "description": "Полностью удаляет значение", "example": "", "parameters": []},
            {"id": "hash", "label": "Хеширование", "description": "Преобразует в хеш", "example": "a1b2c3d4", "parameters": []},
            {"id": "none", "label": "Без изменений", "description": "Оставляет как есть", "example": "Москва", "parameters": []}
        ]
    }

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    input_path = os.path.join(OUTPUT_DIR, f"temp_{file.filename}")
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        with open(input_path, "wb") as f:
            f.write(content)

        with open(input_path, newline="", encoding="utf-8") as f:
            try:
                sample = f.read(2048)
                dialect = csv.Sniffer().sniff(sample)
                f.seek(0)
                reader = csv.reader(f, dialect=dialect)
            except Exception:
                f.seek(0)
                reader = csv.reader(f)

            headers = next(reader, None)
            if not headers:
                raise HTTPException(status_code=400, detail="CSV file has no headers")

            preview_data = []
            total_rows = 0
            for row in reader:
                if len(preview_data) < 5:
                    preview_data.append(row)
                total_rows += 1

            columns = []
            for i, name in enumerate(headers):
                sample_values = [pr[i] for pr in preview_data if i < len(pr)]
                col_type = "string"
                if any("@" in str(v) for v in sample_values):
                    col_type = "email"
                elif any(str(v).replace("+","").replace("-","").replace(" ","").isdigit() for v in sample_values):
                    col_type = "phone"
                
                columns.append({"name": name, "type": col_type, "sample_values": sample_values[:3]})

            return {"filename": file.filename, "total_rows": total_rows, "columns": columns, "preview_data": preview_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@app.post("/api/anonymize")
async def api_anonymize(file: UploadFile = File(...), rules: str = Form("{}")):
    try:
        rules_dict = json.loads(rules)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON rules")

    input_path = os.path.join(OUTPUT_DIR, f"upload_{file.filename}")
    output_path = os.path.join(OUTPUT_DIR, f"anonymized_{file.filename}")

    try:
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)
        
        anonymize_csv(input_path, output_path, rules_dict)
        
        return FileResponse(output_path, media_type="text/csv", filename=f"anonymized_{file.filename}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def api_generate(request: GenerateRequest):
    try:
        filename = f"{request.template_id}_generated.csv"
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        generate_custom_csv_file(
            template_id=request.template_id,
            columns=request.columns,
            count=request.rows,
            output_path=output_path
        )
        
        return FileResponse(output_path, media_type="text/csv", filename=filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))