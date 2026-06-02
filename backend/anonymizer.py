import csv
import hashlib
import re


def mask(value: str) -> str:
    """Маскирование: email → i***@mail.ru, телефон → +79*******67"""
    if not value:
        return value
    value = str(value).strip()

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


def none_method(value: str):
    return value


def _to_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def mask_by_range(value: str, start: int = 0, length: int = 5) -> str:
    if value is None:
        return value

    value = str(value)
    start = max(0, _to_int(start, 0))
    length = max(0, _to_int(length, 5))

    if length == 0 or start >= len(value):
        return value

    end = min(len(value), start + length)
    return value[:start] + ("*" * (end - start)) + value[end:]


METHODS = {
    "mask": mask,
    "redact": redact,
    "hash": pseudo_hash,
    "none": none_method
}


def apply_rule(value: str, rule):
    method = rule
    if isinstance(rule, dict):
        method = rule.get("method", "none")
        if method == "mask":
            if "start" in rule or "length" in rule:
                start = rule.get("start", 0)
                length = rule.get("length", 5)
                return mask_by_range(value, start, length)

    if method in METHODS:
        return METHODS[method](str(value))
    return value


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
                        row[col] = apply_rule(row[col], rule)

                writer.writerow(row)