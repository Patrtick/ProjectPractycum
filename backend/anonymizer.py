import csv
import hashlib
import re


def mask(value: str, start: int = None, length: int = None) -> str:
    """Маскирование: email → i***@mail.ru, телефон → +79*******67 или по параметрам"""
    if not value:
        return value
    value = str(value).strip()

    # Пользовательское маскирование по параметрам
    if start is not None and length is not None:
        try:
            start_idx = int(start)
            mask_len = int(length)
            chars = list(value)
            for i in range(start_idx, min(start_idx + mask_len, len(chars))):
                chars[i] = "*"
            return "".join(chars)
        except (ValueError, TypeError):
            pass

    # Стандартная логика маскирования
    # Даты: дд.мм.гггг -> **.**.20**
    if re.match(r"^\d{2}\.\d{2}\.\d{4}$", value):
        return "**.**.20**"

    # Телефоны: +7 (###) ###-##-## -> +7 (###) ***-**-##
    match = re.match(r"^\+7 \((\d{3})\) (\d{3})-(\d{2})-(\d{2})$", value)
    if match:
        code, part1, part2, last = match.groups()
        return f"+7 ({code}) ***-**-{last}"

    if "@" in value:
        name, domain = value.split("@", 1)
        if len(name) <= 2:
            return "***@" + domain
        return name[:2] + "***@" + domain
    if len(value) >= 7:
        return value[:2] + "****" + value[-2:]
    return "***"


def redact(value: str):
    return ""


def pseudo_hash(value: str):
    if not value:
        return value
    return hashlib.md5(str(value).encode()).hexdigest()[:8]


def sha256_hash(value: str):
    if not value:
        return value
    return hashlib.sha256(str(value).encode()).hexdigest()


def sha1_hash(value: str):
    if not value:
        return value
    return hashlib.sha1(str(value).encode()).hexdigest()


def none_method(value: str):
    return value


METHODS = {
    "mask": mask,
    "redact": redact,
    "hash": pseudo_hash,
    "sha256": sha256_hash,
    "sha1": sha1_hash,
    "none": none_method
}


def anonymize_csv(input_path, output_path, rules: dict):
    with open(input_path, newline="", encoding="utf-8") as infile:
        # Пытаемся определить разделитель
        try:
            sample = infile.read(1024)
            infile.seek(0)
            dialect = csv.Sniffer().sniff(sample)
            infile.seek(0)
            reader = csv.DictReader(infile, dialect=dialect)
        except Exception:
            infile.seek(0)
            reader = csv.DictReader(infile)

        fieldnames = reader.fieldnames
        if not fieldnames:
            with open(output_path, "w", newline="", encoding="utf-8") as outfile:
                pass
            return

        with open(output_path, "w", newline="", encoding="utf-8") as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()

            for row in reader:
                for col, rule in rules.items():
                    if col in row and row[col] is not None:
                        method = rule
                        params = {}
                        if isinstance(rule, dict):
                            method = rule.get("method", "none")
                            params = {k: v for k, v in rule.items() if k != "method"}
                        
                        if method in METHODS:
                            # Передаем параметры, если метод их поддерживает (в нашем случае только mask)
                            if method == "mask":
                                row[col] = METHODS[method](str(row[col]), **params)
                            else:
                                row[col] = METHODS[method](str(row[col]))

                writer.writerow(row)