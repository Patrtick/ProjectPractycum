import csv
import hashlib


def mask(value: str):
    if "@" in value:
        name, domain = value.split("@")
        return name[:2] + "***@" + domain
    return value[:2] + "***"


def redact(value: str):
    return ""


def pseudo_hash(value: str):
    return hashlib.md5(value.encode()).hexdigest()[:8]


METHODS = {
    "mask": mask,
    "redact": redact,
    "hash": pseudo_hash
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
                for col, method in rules.items():
                    if col in row and method in METHODS:
                        # Проверка на None или пустые значения перед анонимизацией
                        if row[col] is not None:
                            row[col] = METHODS[method](row[col])

                writer.writerow(row)