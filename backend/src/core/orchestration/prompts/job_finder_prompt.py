JOB_FINDER_PROMPT = """Extract SPECIFIC job listings and score CV fit. Output JSON only, no explanation.

CV: position={target_position} | skills={skills} | exp={experience}

JOBS:
{jobs_text}

CRITICAL RULES FOR EXTRACTION:
1. ONLY extract single, specific job postings (e.g., "Backend Developer at VNG").
2. DO NOT extract search result pages, category pages, or lists of jobs (e.g., titles like "595 backend engineer Jobs in Vietnam" or "Tuyển dụng IT").
3. The `company` field MUST NOT BE EMPTY. If you cannot find a specific company name, ignore that job entirely. DO NOT include it in the JSON array.
4. Language: ALL text fields must be in Vietnamese.
5. match_score: 0-100 (90+=perfect fit, 70-89=good, 50-69=partial, <50=poor).
6. is_suggested: true if score>=70.

Output Format (JSON only, strictly follow this structure):
{{"jobs":[{{"index":0,"title":"","company":"","logo_url":"","salary":"","location":"","address":"","experience_years":"","tags":[],"posted_date":"","is_verified":false,"description":"","requirements":[],"benefits":[],"match_score":0,"match_reason":"","is_suggested":false,"url":""}}]}}"""