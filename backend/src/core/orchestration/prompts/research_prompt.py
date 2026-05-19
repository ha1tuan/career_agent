COMPANY_RESEARCH_PROMPT = """Extract company info for IT candidate. Output JSON only.

Company: {company_name}
Info found:
{company_info}

Rules:
- Use only info from above, no hallucination
- Unknown field → "" or []
- size: "Startup(<50)" | "SME(50-500)" | "Enterprise(500+)" | ""
- pros_cons: {{ "pros": ["điểm tốt"], "cons": ["điểm chưa tốt"] }}
- products: list[str]
- interview_process: list[str]
- Language: ALL text fields must be in Vietnamese (tiếng Việt).

Output (JSON only, start with {{):
{{"company_name":"{company_name}","industry":"","size":"","culture":"","products":[],"tech_stack":[],"interview_process":[],"pros_cons":{{"pros":[],"cons":[]}}}}"""