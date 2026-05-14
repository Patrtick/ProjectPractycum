# ProjectPractycum - Сервис генерации и анонимизации данных

Сервис предоставляет инструменты для генерации тестовых данных и анонимизации существующих CSV-файлов.

Веб-интерфейс находится по адресу: http://2.26.8.117:8080/

## API v1 (Программный доступ)

### 1. Генерация данных
**Endpoint:** `POST /api/v1/generate`

**Пример запроса:**
```json
{
  "template_id": "users",
  "rows": 3,
  "columns": ["full_name", "email"]
}
```

**Ответ:**
```json
{
  "data": [
    {
      "full_name": "Иван Иванов",
      "email": "ivan@example.com"
    },
    ...
  ],
  "count": 3
}
```

### 2. Анонимизация данных
**Endpoint:** `POST /api/v1/anonymize`

**Пример запроса:**
```json
{
  "data": [
    {"name": "Иван Иванов", "email": "ivan@example.com"}
  ],
  "rules": {
    "email": "mask",
    "name": "redact"
  }
}
```

**Ответ:**
```json
{
  "data": [
    {"name": "", "email": "iv***@example.com"}
  ],
  "count": 1
}
```

### Доступные методы анонимизации:
- `mask`: Маскирование (email → i***@mail.ru)
- `redact`: Удаление значения
- `hash`: Хеширование (MD5, первые 8 символов)
- `none`: Без изменений

## Развертывание
```bash
docker-compose up --build
```
