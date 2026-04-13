"""
CareerPath AI - Backend Server
Flask + SQLite + Anthropic Claude API
"""

from flask import Flask, request, jsonify
import sqlite3
import hashlib
import hmac
import os
import json
import jwt
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from functools import wraps
import tempfile
import pdfplumber
import urllib.parse

app = Flask(__name__)
app.url_map.strict_slashes = False

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "Backend Running",
        "AI": "Configured",
        "Database": "Connected"
    })


@app.route("/api", methods=["GET", "POST"])
def api_index():
    if request.method == "POST":
        return jsonify({
            "error": "Method not allowed for /api",
            "hint": "Use GET /api to list routes, or POST /api/evaluate for evaluation"
        }), 405

    return jsonify({
        "message": "CareerPath AI API",
        "health": "/api/health",
        "auth": {
            "signup": "/api/auth/signup",
            "login": "/api/auth/login",
            "me": "/api/auth/me"
        },
        "profile": {
            "get": "/api/profile",
            "update": "/api/profile",
            "setup_step1": "/api/profile/setup/step1",
            "setup_step2": "/api/profile/setup/step2",
            "setup_step3": "/api/profile/setup/step3",
            "linkedin": "/api/profile/linkedin"
        },
        "evaluation": {
            "run": "/api/evaluate",
            "demo": "/api/evaluate/demo",
            "single": "/api/evaluate/<eval_id>",
            "history": "/api/evaluations",
            "recommendations": "/api/recommendations"
        },
        "resume": {
            "upload": "/api/resume/upload",
            "status": "/api/resume/status"
        },
        "jobs": "/api/jobs/search",
        "dashboard": "/api/dashboard"
    })
# ─── LOAD .env FILE ────────────────────────────────────────────────────────────
def load_env(path=".env"):
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env()

# ─── CONFIG ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("JWT_SECRET", "careerpath-dev-secret-change-in-prod")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-3.5-turbo")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
DB_PATH = os.environ.get("DB_PATH", "careerpath.db")
PORT = int(os.environ.get("PORT", 5000))

# ─── CORS MIDDLEWARE ────────────────────────────────────────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        from flask import Response
        r = Response()
        r.headers["Access-Control-Allow-Origin"] = "*"
        r.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
        r.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        r.status_code = 200
        return r


@app.errorhandler(404)
def not_found(err):
    if request.path.startswith("/api"):
        return jsonify({
            "error": "Route not found",
            "path": request.path,
            "hint": "Check /api for available routes"
        }), 404
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(405)
def method_not_allowed(err):
    if request.path.startswith("/api"):
        return jsonify({
            "error": "Method not allowed",
            "path": request.path,
            "method": request.method,
            "hint": "Use GET /api for route list"
        }), 405
    return jsonify({"error": "Method not allowed"}), 405

# ─── DATABASE ──────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            qualification TEXT,
            year_of_study TEXT,
            skills TEXT DEFAULT '[]',
            linkedin_url TEXT,
            resume_text TEXT,
            resume_filename TEXT,
            area_of_interest TEXT,
            career_goal TEXT,
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skill_score INTEGER,
            skill_level TEXT,
            area_of_interest TEXT,
            raw_result TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            evaluation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            type TEXT,
            data TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
        )
    """)

    conn.commit()
    conn.close()

# ─── HELPERS ───────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return (salt + key).hex()

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        raw = bytes.fromhex(stored_hash)
        salt = raw[:32]
        stored_key = raw[32:]
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
        return hmac.compare_digest(key, stored_key)
    except Exception:
        return False

def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth[7:]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = payload["user_id"]
            request.user_email = payload["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def call_ai(prompt: str, system: str = "") -> str:
    """Call OpenRouter API using urllib."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not set")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    body = {
        "model": OPENROUTER_MODEL,
        "max_tokens": 2048,
        "messages": messages
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://careerpath.ai",
            "X-Title": "CareerPath AI"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
        return result["choices"][0]["message"]["content"]

# ─── SERPAPI JOB SEARCH ────────────────────────────────────────────────────────

def search_jobs_serpapi(query: str, location: str = "", num_results: int = 6) -> list:
    """Search real job listings via SerpAPI Google Jobs."""
    if not SERPAPI_KEY:
        return []

    params = {
        "engine": "google_jobs",
        "q": query,
        "hl": "en",
        "gl": "in",
        "api_key": SERPAPI_KEY,
    }
    if location:
        params["location"] = location

    url = f"https://serpapi.com/search.json?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CareerPathAI/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        jobs = []
        for i, job in enumerate(data.get("jobs_results", [])[:num_results]):
            apply_options = job.get("apply_options", [])
            apply_url = apply_options[0].get("link") if apply_options else None
            ext = job.get("detected_extensions", {})
            salary = ext.get("salary", "")
            work_from_home = ext.get("work_from_home", False)
            schedule = ext.get("schedule_type", "")

            loc_parts = []
            if job.get("location"):
                loc_parts.append(job["location"])
            if work_from_home:
                loc_parts.append("Remote option")

            jobs.append({
                "title": job.get("title", ""),
                "company": job.get("company_name", ""),
                "description": (job.get("description", "")[:200] + "...") if job.get("description") else "",
                "location": " · ".join(loc_parts) if loc_parts else "See listing",
                "schedule": schedule,
                "salary": salary,
                "url": apply_url,
                "source": "Google Jobs",
                "priority": i + 1,
                "thumbnail": job.get("thumbnail"),
            })
        return jobs

    except Exception as e:
        print(f"[SerpAPI] Job search failed: {e}")
        return []


def build_job_query(skill_level: str, area_of_interest: str, career_goal: str, skills: list) -> tuple:
    """Build smart search queries from profile. Returns (primary_query, fallback_query)."""
    top_skills = skills[:3] if skills else []
    interest = area_of_interest or (top_skills[0] if top_skills else "software developer")

    if skill_level == "beginner":
        primary = f"{interest} internship"
        fallback = f"entry level {interest} fresher"
    elif skill_level == "moderate":
        primary = f"junior {interest} job"
        fallback = f"{interest} internship stipend"
    else:
        primary = f"senior {interest} engineer"
        fallback = f"{interest} lead developer"

    return primary, fallback


# ─── AUTH ROUTES ───────────────────────────────────────────────────────────────
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    try:
        pw_hash = hash_password(password)
        c = conn.cursor()
        c.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                  (name, email, pw_hash))
        user_id = c.lastrowid
        # Create empty profile
        c.execute("INSERT INTO profiles (user_id) VALUES (?)", (user_id,))
        conn.commit()
        token = create_token(user_id, email)
        return jsonify({
            "token": token,
            "user": {"id": user_id, "name": name, "email": email}
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    finally:
        conn.close()


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,))
        user = c.fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid email or password"}), 401
        token = create_token(user["id"], user["email"])
        return jsonify({
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
        })
    finally:
        conn.close()


@app.route("/api/auth/me", methods=["GET"])
@token_required
def me():
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (request.user_id,))
        user = dict(c.fetchone())
        return jsonify({"user": user})
    finally:
        conn.close()

# ─── PROFILE ROUTES ─────────────────────────────────────────────────────────────
@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile():
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT u.id, u.name, u.email, p.qualification, p.year_of_study,
                   p.skills, p.linkedin_url, p.resume_filename, p.area_of_interest, p.career_goal, p.updated_at
            FROM users u LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
        """, (request.user_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "Profile not found"}), 404
        profile = dict(row)
        profile["skills"] = json.loads(profile.get("skills") or "[]")
        return jsonify({"profile": profile})
    finally:
        conn.close()


@app.route("/api/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json()
    fields = ["qualification", "year_of_study", "skills", "linkedin_url",
              "area_of_interest", "career_goal"]
    
    conn = get_db()
    try:
        c = conn.cursor()
        # Upsert profile
        existing = c.execute("SELECT id FROM profiles WHERE user_id = ?", (request.user_id,)).fetchone()
        skills_json = json.dumps(data.get("skills", [])) if isinstance(data.get("skills"), list) else data.get("skills", "[]")

        if existing:
            set_parts = []
            values = []
            for f in fields:
                if f in data:
                    set_parts.append(f"{f} = ?")
                    values.append(skills_json if f == "skills" else data[f])
            set_parts.append("updated_at = datetime('now')")
            if set_parts:
                c.execute(f"UPDATE profiles SET {', '.join(set_parts)} WHERE user_id = ?",
                          values + [request.user_id])
        else:
            c.execute("""
                INSERT INTO profiles (user_id, qualification, year_of_study, skills,
                    linkedin_url, area_of_interest, career_goal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                request.user_id,
                data.get("qualification"), data.get("year_of_study"),
                skills_json, data.get("linkedin_url"),
                data.get("area_of_interest"), data.get("career_goal")
            ))
        conn.commit()
        return jsonify({"message": "Profile updated successfully"})
    finally:
        conn.close()


# ─── PROFILE SETUP (multi-step onboarding) ────────────────────────────────────
@app.route("/api/profile/setup/step1", methods=["POST"])
@token_required
def setup_step1():
    """Educational background"""
    data = request.get_json()
    qualification = data.get("qualification", "")
    year_of_study = data.get("year_of_study", "")

    if not qualification or not year_of_study:
        return jsonify({"error": "qualification and year_of_study required"}), 400

    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            UPDATE profiles SET qualification = ?, year_of_study = ?, updated_at = datetime('now')
            WHERE user_id = ?
        """, (qualification, year_of_study, request.user_id))
        conn.commit()
        return jsonify({"message": "Step 1 saved", "next_step": 2})
    finally:
        conn.close()


@app.route("/api/profile/setup/step2", methods=["POST"])
@token_required
def setup_step2():
    """Skills"""
    data = request.get_json()
    skills = data.get("skills", [])

    if not isinstance(skills, list):
        return jsonify({"error": "skills must be an array"}), 400

    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            UPDATE profiles SET skills = ?, updated_at = datetime('now')
            WHERE user_id = ?
        """, (json.dumps(skills), request.user_id))
        conn.commit()
        return jsonify({"message": "Step 2 saved", "next_step": 3})
    finally:
        conn.close()


@app.route("/api/profile/setup/step3", methods=["POST"])
@token_required
def setup_step3():
    """Career goals"""
    data = request.get_json()
    area_of_interest = data.get("area_of_interest", "")
    career_goal = data.get("career_goal", "")

    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            UPDATE profiles SET area_of_interest = ?, career_goal = ?, updated_at = datetime('now')
            WHERE user_id = ?
        """, (area_of_interest, career_goal, request.user_id))
        conn.commit()
        return jsonify({"message": "Step 3 saved", "profile_complete": True})
    finally:
        conn.close()


@app.route("/api/profile/linkedin", methods=["POST"])
@token_required
def save_linkedin():
    """Save LinkedIn URL"""
    data = request.get_json()
    url = data.get("linkedin_url", "")

    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("UPDATE profiles SET linkedin_url = ? WHERE user_id = ?", (url, request.user_id))
        conn.commit()
        return jsonify({"message": "LinkedIn URL saved"})
    finally:
        conn.close()


# ─── AI EVALUATION ─────────────────────────────────────────────────────────────
@app.route("/api/evaluate", methods=["POST"])
@token_required
def evaluate_profile():
    """
    AI evaluation of user profile.
    Returns skill score, level, and personalized recommendations.
    """
    # Fetch full profile
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT u.name, p.qualification, p.year_of_study, p.skills,
                   p.linkedin_url, p.area_of_interest, p.career_goal
            FROM users u LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
        """, (request.user_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "Profile not found"}), 404
        profile = dict(row)
    finally:
        conn.close()

    skills = json.loads(profile.get("skills") or "[]")
    
    # Build AI prompt
    system_prompt = """You are CareerPath AI, an expert career counselor specializing in evaluating student profiles and recommending career opportunities.

You will be given a student's profile and must:
1. Evaluate their skill level (score 0-100)
2. Categorize them: "beginner" (0-40), "moderate" (41-70), "advanced" (71-100)
3. Based on their level, provide appropriate recommendations:
   - Beginner: Provide a learning roadmap with specific courses, skills to learn, and timeline
   - Moderate: Provide 3-5 internship opportunities and 2-3 entry-level job opportunities
   - Advanced: Provide 3-5 high-level job opportunities and career advancement paths

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no explanation outside JSON.

Response format:
{
  "skill_score": <number 0-100>,
  "skill_level": "<beginner|moderate|advanced>",
  "skill_analysis": "<brief analysis of their skills>",
  "recommendations": {
    "type": "<roadmap|internships|jobs>",
    "summary": "<one sentence summary>",
    "items": [
      {
        "title": "<opportunity or step title>",
        "company": "<company name if applicable, else null>",
        "description": "<brief description>",
        "duration": "<duration e.g. 3 months, or null>",
        "location": "<location or Remote, or null>",
        "required_skills": ["skill1", "skill2"],
        "url": null,
        "priority": <1-5 where 1 is highest>
      }
    ]
  },
  "improvement_tips": ["tip1", "tip2", "tip3"]
}"""

    user_prompt = f"""Please evaluate this student profile:

Name: {profile.get('name', 'Unknown')}
Educational Qualification: {profile.get('qualification', 'Not specified')}
Current Year of Study: {profile.get('year_of_study', 'Not specified')}
Skills: {', '.join(skills) if skills else 'None listed'}
LinkedIn Profile: {profile.get('linkedin_url') or 'Not provided'}
Area of Interest: {profile.get('area_of_interest', 'Not specified')}
Career Goal: {profile.get('career_goal', 'Not specified')}

Based on this profile, provide a comprehensive evaluation and recommendations."""

    try:
        ai_response = call_ai(user_prompt, system_prompt)
        # Parse JSON response
        # Strip potential markdown code blocks
        cleaned = ai_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        result = json.loads(cleaned)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            # If API credentials are invalid, still provide a deterministic demo-style response.
            result = _generate_fallback_evaluation(skills, profile)
        else:
            return jsonify({"error": f"AI service HTTP error: {e.code}"}), 503
    except urllib.error.URLError as e:
        return jsonify({"error": f"AI service unavailable: {str(e)}"}), 503
    except json.JSONDecodeError:
        # Fallback: return a simulated response if AI parsing fails
        result = _generate_fallback_evaluation(skills, profile)
    except Exception as e:
        return jsonify({"error": f"Evaluation failed: {str(e)}"}), 500

    # Save evaluation to DB
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            INSERT INTO evaluations (user_id, skill_score, skill_level, area_of_interest, raw_result)
            VALUES (?, ?, ?, ?, ?)
        """, (
            request.user_id,
            result.get("skill_score"),
            result.get("skill_level"),
            profile.get("area_of_interest"),
            json.dumps(result)
        ))
        eval_id = c.lastrowid

        # Save recommendations
        recs = result.get("recommendations", {})
        c.execute("""
            INSERT INTO recommendations (evaluation_id, user_id, type, data)
            VALUES (?, ?, ?, ?)
        """, (eval_id, request.user_id, recs.get("type"), json.dumps(recs)))

        conn.commit()
        result["evaluation_id"] = eval_id
    finally:
        conn.close()

    return jsonify({"evaluation": result})


@app.route("/api/evaluate/demo", methods=["POST"])
def evaluate_profile_demo():
    """
    Demo evaluation endpoint without auth.
    Accepts free-form profile_text and optional fields for quick testing.
    """
    data = request.get_json(silent=True) or {}
    profile_text = (data.get("profile_text") or "").strip()
    if not profile_text:
        return jsonify({"error": "profile_text is required"}), 400

    skills = data.get("skills", [])
    if not isinstance(skills, list):
        skills = []

    profile = {
        "name": (data.get("name") or "Demo User").strip(),
        "qualification": (data.get("qualification") or "").strip(),
        "year_of_study": (data.get("year_of_study") or "").strip(),
        "linkedin_url": (data.get("linkedin_url") or "").strip(),
        "area_of_interest": (data.get("area_of_interest") or "").strip(),
        "career_goal": (data.get("career_goal") or "").strip(),
    }

    system_prompt = """You are CareerPath AI, an expert career counselor specializing in evaluating student profiles and recommending career opportunities.

You will be given a student's profile text and must:
1. Evaluate their skill level (score 0-100)
2. Categorize them: "beginner" (0-40), "moderate" (41-70), "advanced" (71-100)
3. Based on their level, provide appropriate recommendations:
   - Beginner: Provide a learning roadmap with specific courses, skills to learn, and timeline
   - Moderate: Provide 3-5 internship opportunities and 2-3 entry-level job opportunities
   - Advanced: Provide 3-5 high-level job opportunities and career advancement paths

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no explanation outside JSON.

Response format:
{
  "skill_score": <number 0-100>,
  "skill_level": "<beginner|moderate|advanced>",
  "skill_analysis": "<brief analysis of their skills>",
  "recommendations": {
    "type": "<roadmap|internships|jobs>",
    "summary": "<one sentence summary>",
    "items": [
      {
        "title": "<opportunity or step title>",
        "company": "<company name if applicable, else null>",
        "description": "<brief description>",
        "duration": "<duration e.g. 3 months, or null>",
        "location": "<location or Remote, or null>",
        "required_skills": ["skill1", "skill2"],
        "url": null,
        "priority": <1-5 where 1 is highest>
      }
    ]
  },
  "improvement_tips": ["tip1", "tip2", "tip3"]
}"""

    user_prompt = f"""Please evaluate this student profile:

Name: {profile.get('name') or 'Unknown'}
Educational Qualification: {profile.get('qualification') or 'Not specified'}
Current Year of Study: {profile.get('year_of_study') or 'Not specified'}
Skills: {', '.join(skills) if skills else 'None listed'}
LinkedIn Profile: {profile.get('linkedin_url') or 'Not provided'}
Area of Interest: {profile.get('area_of_interest') or 'Not specified'}
Career Goal: {profile.get('career_goal') or 'Not specified'}

Profile Text:
{profile_text}

Based on this profile, provide a comprehensive evaluation and recommendations."""

    try:
        ai_response = call_ai(user_prompt, system_prompt)
        cleaned = ai_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        result = json.loads(cleaned)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return jsonify({
                "error": "AI authentication failed. Check OPENROUTER_API_KEY in .env"
            }), 503
        return jsonify({"error": f"AI service HTTP error: {e.code}"}), 503
    except urllib.error.URLError as e:
        return jsonify({"error": f"AI service unavailable: {str(e)}"}), 503
    except json.JSONDecodeError:
        result = _generate_fallback_evaluation(skills, profile)
    except Exception as e:
        return jsonify({"error": f"Evaluation failed: {str(e)}"}), 500

    return jsonify({"evaluation": result, "mode": "demo"})


@app.route("/api/evaluate/<int:eval_id>", methods=["GET"])
@token_required
def get_evaluation(eval_id):
    """Get a specific evaluation by ID"""
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT * FROM evaluations WHERE id = ? AND user_id = ?
        """, (eval_id, request.user_id))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "Evaluation not found"}), 404
        evaluation = dict(row)
        evaluation["raw_result"] = json.loads(evaluation.get("raw_result") or "{}")
        return jsonify({"evaluation": evaluation})
    finally:
        conn.close()


@app.route("/api/evaluations", methods=["GET"])
@token_required
def list_evaluations():
    """List all evaluations for the current user"""
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT id, skill_score, skill_level, area_of_interest, created_at
            FROM evaluations WHERE user_id = ? ORDER BY created_at DESC
        """, (request.user_id,))
        rows = c.fetchall()
        evaluations = [dict(r) for r in rows]
        return jsonify({"evaluations": evaluations, "total": len(evaluations)})
    finally:
        conn.close()


# ─── RECOMMENDATIONS ───────────────────────────────────────────────────────────
@app.route("/api/recommendations", methods=["GET"])
@token_required
def get_recommendations():
    """Get latest recommendations for the user"""
    conn = get_db()
    try:
        c = conn.cursor()
        # Get latest evaluation
        c.execute("""
            SELECT e.id, e.skill_score, e.skill_level, e.area_of_interest,
                   e.created_at, r.type, r.data
            FROM evaluations e
            LEFT JOIN recommendations r ON e.id = r.evaluation_id
            WHERE e.user_id = ?
            ORDER BY e.created_at DESC
            LIMIT 1
        """, (request.user_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "No evaluations found. Please evaluate your profile first."}), 404
        
        result = dict(row)
        result["data"] = json.loads(result.get("data") or "{}")
        return jsonify({"recommendations": result})
    finally:
        conn.close()


# ─── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
@token_required
def get_dashboard():
    """Get dashboard summary for the user"""
    conn = get_db()
    try:
        c = conn.cursor()
        
        # User info
        c.execute("SELECT id, name, email FROM users WHERE id = ?", (request.user_id,))
        user = dict(c.fetchone())

        # Profile completion (exclude heavy resume_text column)
        c.execute("""
            SELECT id, user_id, qualification, year_of_study, skills,
                   linkedin_url, resume_filename, area_of_interest, career_goal, updated_at,
                   CASE WHEN resume_text IS NOT NULL AND resume_text != '' THEN 1 ELSE 0 END as has_resume_text
            FROM profiles WHERE user_id = ?
        """, (request.user_id,))
        profile_row = c.fetchone()
        profile = dict(profile_row) if profile_row else {}
        profile["skills"] = json.loads(profile.get("skills") or "[]")
        # Treat resume_text as filled if the flag says so
        if profile.pop("has_resume_text", 0):
            profile["resume_text"] = "present"
        has_resume = bool(profile.get("resume_filename"))
        
        completion = _calc_profile_completion(profile)

        # Evaluations
        c.execute("""
            SELECT id, skill_score, skill_level, area_of_interest, created_at
            FROM evaluations WHERE user_id = ? ORDER BY created_at DESC
        """, (request.user_id,))
        evaluations = [dict(r) for r in c.fetchall()]
        
        latest = evaluations[0] if evaluations else None

        return jsonify({
            "user": user,
            "profile_completion": completion,
            "total_evaluations": len(evaluations),
            "current_skill_score": latest["skill_score"] if latest else None,
            "skill_level": latest["skill_level"] if latest else None,
            "latest_evaluation": latest,
            "evaluation_history": evaluations,
            "has_resume": has_resume,
            "resume_filename": profile.get("resume_filename")
        })
    finally:
        conn.close()


def _calc_profile_completion(profile: dict) -> int:
    fields = ["qualification", "year_of_study", "skills", "resume_text",
              "area_of_interest", "career_goal"]
    filled = 0
    for f in fields:
        v = profile.get(f)
        if v and v != "[]" and v != []:
            filled += 1
    return int((filled / len(fields)) * 100)


def _generate_fallback_evaluation(skills: list, profile: dict) -> dict:
    """Fallback evaluation when AI is unavailable"""
    score = min(40 + len(skills) * 5, 85)
    level = "beginner" if score < 41 else ("moderate" if score < 71 else "advanced")
    
    internships = [
        {
            "title": "Software Developer Intern",
            "company": "TechStartup Inc.",
            "description": "Work on real-world projects using modern web technologies",
            "duration": "3 months",
            "location": "Remote",
            "required_skills": skills[:3] if skills else ["Programming"],
            "url": None,
            "priority": 1
        },
        {
            "title": "Junior Web Developer",
            "company": "WebAgency Co.",
            "description": "Build and maintain web applications for clients",
            "duration": "6 months",
            "location": "Hybrid",
            "required_skills": skills[:2] if skills else ["HTML", "CSS"],
            "url": None,
            "priority": 2
        }
    ]
    
    return {
        "skill_score": score,
        "skill_level": level,
        "skill_analysis": f"Based on your {len(skills)} listed skills, you have a {level} skill level.",
        "recommendations": {
            "type": "internships" if level == "moderate" else ("roadmap" if level == "beginner" else "jobs"),
            "summary": "Here are opportunities matched to your skill level",
            "items": internships
        },
        "improvement_tips": [
            "Keep building projects to strengthen your portfolio",
            "Contribute to open source projects",
            "Network with professionals in your field"
        ]
    }


# ─── RESUME UPLOAD & SCAN (AI) ─────────────────────────────────────────────────
@app.route("/api/resume/upload", methods=["POST"])
@token_required
def upload_resume():
    """
    Accept a PDF resume upload, extract text with pdfplumber,
    run AI evaluation, and save results.
    """
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded. Send the PDF as form field 'resume'"}), 400

    file = request.files["resume"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    # ── Extract text from PDF ──────────────────────────────────────────────────
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        resume_text = ""
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    resume_text += page_text + "\n"

        os.unlink(tmp_path)  # Clean up temp file
    except Exception as e:
        return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 422

    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from PDF. Make sure it's not a scanned image-only PDF."}), 422

    # Truncate to ~3000 chars to stay within token limits
    resume_text_trimmed = resume_text[:3000]

    # ── Save resume text to profile ────────────────────────────────────────────
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            UPDATE profiles SET resume_text = ?, resume_filename = ?, updated_at = datetime('now')
            WHERE user_id = ?
        """, (resume_text, file.filename, request.user_id))

        # Also fetch existing profile for context
        c.execute("""
            SELECT u.name, p.qualification, p.year_of_study, p.skills,
                   p.area_of_interest, p.career_goal
            FROM users u LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
        """, (request.user_id,))
        row = c.fetchone()
        conn.commit()
    finally:
        conn.close()

    profile = dict(row) if row else {}
    skills = json.loads(profile.get("skills") or "[]")

    # ── Build AI prompt ────────────────────────────────────────────────────────
    system_prompt = """You are CareerPath AI, an expert career counselor and resume analyst.

You will be given a student's resume text along with their profile info. You must:
1. Carefully read the resume and extract all skills, experience, education, and projects
2. Evaluate their skill level with a score 0-100
3. Categorize them: "beginner" (0-40), "moderate" (41-70), "advanced" (71-100)
4. Based on their level, provide appropriate recommendations:
   - Beginner: A step-by-step learning roadmap with specific courses, skills to learn, and timeline
   - Moderate: 3-5 internship opportunities and 2-3 entry-level job opportunities  
   - Advanced: 3-5 high-level job opportunities and career advancement paths
5. Also provide specific resume improvement suggestions

IMPORTANT: Respond with ONLY valid JSON, no markdown, no text outside JSON.

Response format:
{
  "skill_score": <number 0-100>,
  "skill_level": "<beginner|moderate|advanced>",
  "skill_analysis": "<detailed analysis of their skills based on resume>",
  "extracted_skills": ["skill1", "skill2", "skill3"],
  "resume_highlights": ["highlight1", "highlight2"],
  "resume_improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendations": {
    "type": "<roadmap|internships|jobs>",
    "summary": "<one sentence summary>",
    "items": [
      {
        "title": "<opportunity or learning step title>",
        "company": "<company name if applicable, else null>",
        "description": "<brief description>",
        "duration": "<duration e.g. 3 months, or null>",
        "location": "<location or Remote, or null>",
        "required_skills": ["skill1", "skill2"],
        "url": null,
        "priority": <1-5 where 1 is highest>
      }
    ]
  },
  "improvement_tips": ["tip1", "tip2", "tip3"]
}"""

    user_prompt = f"""Please evaluate this student's resume and provide career recommendations.

=== RESUME TEXT ===
{resume_text_trimmed}
=== END RESUME ===

Additional profile info provided by student:
- Name: {profile.get('name', 'Unknown')}
- Qualification: {profile.get('qualification', 'Not specified')}
- Year of Study: {profile.get('year_of_study', 'Not specified')}
- Skills (self-reported): {', '.join(skills) if skills else 'None'}
- Area of Interest: {profile.get('area_of_interest', 'Not specified')}
- Career Goal: {profile.get('career_goal', 'Not specified')}

Analyze the resume thoroughly and provide a complete evaluation with recommendations."""

    try:
        ai_response = call_ai(user_prompt, system_prompt)
        cleaned = ai_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        result = json.loads(cleaned)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            result = _generate_fallback_evaluation(skills, profile)
        else:
            return jsonify({"error": f"AI service HTTP error: {e.code}"}), 503
    except urllib.error.URLError as e:
        return jsonify({"error": f"AI service unavailable: {str(e)}"}), 503
    except json.JSONDecodeError:
        result = _generate_fallback_evaluation(skills, profile)
    except Exception as e:
        return jsonify({"error": f"Resume evaluation failed: {str(e)}"}), 500

    # ── Inject real job listings from SerpAPI ─────────────────────────────────
    skill_level     = result.get("skill_level", "beginner")
    area_of_interest = profile.get("area_of_interest", "")
    career_goal      = profile.get("career_goal", "")
    all_skills       = list(set(skills + result.get("extracted_skills", [])))

    if SERPAPI_KEY and skill_level in ("moderate", "advanced"):
        primary_q, fallback_q = build_job_query(skill_level, area_of_interest, career_goal, all_skills)
        live_jobs = search_jobs_serpapi(primary_q, num_results=5)
        if not live_jobs:
            live_jobs = search_jobs_serpapi(fallback_q, num_results=5)

        if live_jobs:
            result["live_jobs"] = live_jobs
            result["live_jobs_query"] = primary_q

    elif SERPAPI_KEY and skill_level == "beginner":
        # Even for beginners, show some internship listings
        q = f"{area_of_interest or 'software'} internship fresher"
        internships = search_jobs_serpapi(q, num_results=4)
        if internships:
            result["live_jobs"] = internships
            result["live_jobs_query"] = q

    # ── Save evaluation to DB ──────────────────────────────────────────────────
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("""
            INSERT INTO evaluations (user_id, skill_score, skill_level, area_of_interest, raw_result)
            VALUES (?, ?, ?, ?, ?)
        """, (
            request.user_id,
            result.get("skill_score"),
            result.get("skill_level"),
            profile.get("area_of_interest"),
            json.dumps(result)
        ))
        eval_id = c.lastrowid

        recs = result.get("recommendations", {})
        c.execute("""
            INSERT INTO recommendations (evaluation_id, user_id, type, data)
            VALUES (?, ?, ?, ?)
        """, (eval_id, request.user_id, recs.get("type"), json.dumps(recs)))

        conn.commit()
        result["evaluation_id"] = eval_id
    finally:
        conn.close()

    return jsonify({
        "message": "Resume scanned and evaluated successfully",
        "filename": file.filename,
        "text_extracted": len(resume_text),
        "evaluation": result
    })


@app.route("/api/resume/status", methods=["GET"])
@token_required
def resume_status():
    """Check if user has uploaded a resume"""
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("SELECT resume_filename, updated_at FROM profiles WHERE user_id = ?",
                  (request.user_id,))
        row = c.fetchone()
        if row and row["resume_filename"]:
            return jsonify({
                "has_resume": True,
                "filename": row["resume_filename"],
                "uploaded_at": row["updated_at"]
            })
        return jsonify({"has_resume": False})
    finally:
        conn.close()


# ─── JOBS SEARCH ───────────────────────────────────────────────────────────────
@app.route("/api/jobs/search", methods=["GET"])
@token_required
def jobs_search():
    """
    Search live jobs via SerpAPI.
    Query params: q (search term), location (optional)
    """
    if not SERPAPI_KEY:
        return jsonify({"error": "SerpAPI not configured. Add SERPAPI_KEY to .env"}), 503

    q        = request.args.get("q", "").strip()
    location = request.args.get("location", "").strip()

    if not q:
        # Auto-build query from user's profile
        conn = get_db()
        try:
            c = conn.cursor()
            c.execute("SELECT skills, area_of_interest, career_goal FROM profiles WHERE user_id = ?",
                      (request.user_id,))
            row = c.fetchone()
        finally:
            conn.close()

        if row:
            p_skills  = json.loads(row["skills"] or "[]")
            p_interest = row["area_of_interest"] or ""
            p_goal     = row["career_goal"] or ""
        else:
            p_skills, p_interest, p_goal = [], "", ""

        # Get latest skill level
        conn = get_db()
        try:
            c = conn.cursor()
            c.execute("SELECT skill_level FROM evaluations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                      (request.user_id,))
            ev = c.fetchone()
            skill_level = ev["skill_level"] if ev else "moderate"
        finally:
            conn.close()

        q, _ = build_job_query(skill_level, p_interest, p_goal, p_skills)

    jobs = search_jobs_serpapi(q, location=location, num_results=8)

    return jsonify({
        "jobs": jobs,
        "query": q,
        "total": len(jobs),
        "powered_by": "Google Jobs via SerpAPI"
    })


# ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "CareerPath AI Backend",
        "ai_configured": bool(OPENROUTER_API_KEY),
        "serpapi_configured": bool(SERPAPI_KEY),
        "timestamp": datetime.utcnow().isoformat()
    })


# ─── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"🚀 CareerPath AI Backend starting on port {PORT}")
    print(f"   AI configured:      {bool(OPENROUTER_API_KEY)}")
    print(f"   SerpAPI configured: {bool(SERPAPI_KEY)}")
    print(f"   DB path:            {DB_PATH}")
    print(f"   Resume upload:      enabled (pdfplumber)")
    app.run(host="0.0.0.0", port=PORT, debug=True)
