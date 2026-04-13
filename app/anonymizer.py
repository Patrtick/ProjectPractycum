import csv
import hashlib


def mask(value: str) -> str:
    """Маскирование: email → i***@mail.ru, телефон → +79*******67"""
    if "@" in value:
        name, domain = value.split("@")
        if len(name) <= 2:
            return "***@" + domain
        return name[:2] + "***@" + domain
    if len(value) >= 7:
        return value[:2] + "****" + value[-2:]
    return "***"


def redact(value: str):
    return ""


def pseudo_hash(value: str):
    return hashlib.md5(value.encode()).hexdigest()[:8]


def none_method(value: str):
    return value


METHODS = {
    "mask": mask,
    "redact": redact,
    "hash": pseudo_hash,
    "none": none_method
}


def anonymize_csv(input_path, output_path, rules: dict):
    with open(input_path, newline="", encoding="utf-8") as infile:
        # Пытаемся определить разделитель
        try:
            sample = infile.read(1024)
            dialect = csv.Sniffer().sniff(sample)
            infile.seek(0)
            reader = csv.DictReader(infile, dialect=dialect)
        except Exception:
            infile.seek(0)
            reader = csv.DictReader(infile)

        fieldnames = reader.fieldnames
        if not fieldnames:
            # Пустой файл, просто копируем заголовок (которого нет) или выходим
            with open(output_path, "w", newline="", encoding="utf-8") as outfile:
                pass
            return

        with open(output_path, "w", newline="", encoding="utf-8") as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()

            for row in reader:
                for col, rule in rules.items():
                    if col in row:
                        method = rule
                        if isinstance(rule, dict):
                            method = rule.get("method")
                        
                        if method in METHODS:
                            # Проверка на None или пустые значения перед анонимизацией
                            if row[col] is not None:
                                row[col] = METHODS[method](str(row[col]))

                writer.writerow(row)