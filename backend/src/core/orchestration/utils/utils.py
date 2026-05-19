import json

def _parse_json(raw: str) -> dict:
    cleaned = raw.strip()
    
    # 1. Tìm kiếm khối markdown json ```json ... ```
    if "```json" in cleaned:
        try:
            parts = cleaned.split("```json")
            if len(parts) > 1:
                content = parts[1].split("```")[0].strip()
                return json.loads(content)
        except Exception:
            pass

    # 2. Tìm kiếm khối markdown ``` ... ``` thông thường
    if "```" in cleaned:
        try:
            parts = cleaned.split("```")
            if len(parts) > 1:
                content = parts[1].strip()
                if content.startswith("json\n"):
                    content = content[5:].strip()
                return json.loads(content)
        except Exception:
            pass

    # 3. Fallback: tìm ngoặc nhọn đầu tiên '{' và cuối cùng '}' để extract JSON
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(cleaned[start:end+1])
        except Exception:
            pass

    # 4. Trực tiếp parse toàn bộ chuỗi
    try:
        return json.loads(cleaned)
    except Exception:
        return {}