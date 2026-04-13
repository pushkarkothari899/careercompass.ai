import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";

/* ─── API CONFIG ─────────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ─── AUTH CONTEXT ───────────────────────────────────────────── */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cp_token"));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_user")); } catch { return null; }
  });

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("cp_token", newToken);
    localStorage.setItem("cp_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("cp_token");
    localStorage.removeItem("cp_user");
  };

  const authFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        ...(!options.body || typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res;
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() { return useContext(AuthContext); }

/* ─── CONSTANTS ──────────────────────────────────────────────── */
const AREAS_OF_INTEREST = [
  "Software Development", "Data Science", "Machine Learning / AI", "UI/UX Design",
  "Product Management", "DevOps / Cloud", "Cybersecurity", "Finance / FinTech",
  "Business Analytics", "Digital Marketing"
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate", "Alumni"];

const QUIZ_QUESTIONS = [
  { id: 1, emoji: "🧠", question: "When solving a problem, you prefer to...", options: [
    { label: "Analyze data and find patterns", tags: ["Data Science", "Business Analytics"] },
    { label: "Build something hands-on", tags: ["Software Development", "DevOps / Cloud"] },
    { label: "Design the experience for users", tags: ["UI/UX Design", "Product Management"] },
    { label: "Strategize and plan the big picture", tags: ["Product Management", "Finance / FinTech"] },
  ]},
  { id: 2, emoji: "💼", question: "Your dream work environment is...", options: [
    { label: "A fast-paced startup building new things", tags: ["Software Development", "Product Management"] },
    { label: "A research lab exploring cutting-edge ideas", tags: ["Machine Learning / AI", "Data Science"] },
    { label: "A creative studio focused on design", tags: ["UI/UX Design", "Digital Marketing"] },
    { label: "A structured company with clear processes", tags: ["Finance / FinTech", "Cybersecurity"] },
  ]},
  { id: 3, emoji: "⚡", question: "What excites you the most about technology?", options: [
    { label: "AI & Machine Learning possibilities", tags: ["Machine Learning / AI", "Data Science"] },
    { label: "Building apps people actually use", tags: ["Software Development", "UI/UX Design"] },
    { label: "Keeping systems secure and protected", tags: ["Cybersecurity", "DevOps / Cloud"] },
    { label: "Using data to drive business decisions", tags: ["Business Analytics", "Finance / FinTech"] },
  ]},
  { id: 4, emoji: "🎯", question: "In a group project, you naturally become...", options: [
    { label: "The one writing code / building the product", tags: ["Software Development", "DevOps / Cloud"] },
    { label: "The one analyzing results and insights", tags: ["Data Science", "Business Analytics"] },
    { label: "The one designing how it looks and feels", tags: ["UI/UX Design", "Digital Marketing"] },
    { label: "The one managing the roadmap and team", tags: ["Product Management", "Finance / FinTech"] },
  ]},
  { id: 5, emoji: "🚀", question: "In 5 years, you want to be known as...", options: [
    { label: "An expert engineer or developer", tags: ["Software Development", "DevOps / Cloud"] },
    { label: "An AI / data expert making predictions", tags: ["Machine Learning / AI", "Data Science"] },
    { label: "A creative who shapes user experiences", tags: ["UI/UX Design", "Digital Marketing"] },
    { label: "A leader driving business strategy", tags: ["Product Management", "Finance / FinTech"] },
  ]},
];

/* ─── CSS ─────────────────────────────────────────────────────── */
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; font-family: 'Plus Jakarta Sans', sans-serif; background: #f5f5f0; color: #111; }
  input, select, textarea, button { font-family: inherit; }

  .btn-primary { width: 100%; padding: 14px 24px; background: #111; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
  .btn-primary:hover { background: #222; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
  .btn-primary:disabled { background: #999; cursor: not-allowed; transform: none; }
  .btn-secondary { width: 100%; padding: 14px 24px; background: #fff; color: #111; border: 2px solid #e5e5e0; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { border-color: #111; transform: translateY(-1px); }
  .btn-ghost { padding: 12px 24px; background: transparent; color: #555; border: 2px solid #e5e5e0; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-ghost:hover { border-color: #aaa; color: #111; }
  .btn-accent { padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(99,102,241,0.35); }
  .btn-accent:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.45); }
  .btn-accent:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .form-input { width: 100%; padding: 13px 16px; background: #f0f0eb; border: 2px solid transparent; border-radius: 12px; font-size: 15px; color: #111; outline: none; transition: border-color 0.2s, background 0.2s; }
  .form-input:focus { border-color: #6366f1; background: #fff; }
  .form-input::placeholder { color: #aaa; }
  .form-select { width: 100%; padding: 13px 16px; background: #f0f0eb; border: 2px solid transparent; border-radius: 12px; font-size: 15px; color: #111; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
  .form-select:focus { border-color: #6366f1; }

  .quiz-option { width: 100%; padding: 16px 20px; border: 2px solid #e5e5e0; border-radius: 14px; background: #fff; font-size: 15px; font-weight: 500; cursor: pointer; color: #333; text-align: left; transition: all 0.2s; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
  .quiz-option:hover { border-color: #6366f1; background: #f5f3ff; color: #4f46e5; transform: translateX(4px); }
  .quiz-option.selected { border-color: #6366f1; background: #eef2ff; color: #4f46e5; font-weight: 700; }
  .opt-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #ddd; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .quiz-option.selected .opt-dot { background: #6366f1; border-color: #6366f1; }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 18px; border: none; background: transparent; text-align: left; font-size: 14px; font-weight: 500; color: #666; cursor: pointer; border-radius: 10px; margin: 2px 8px; width: calc(100% - 16px); transition: all 0.15s; }
  .nav-item:hover { background: #f0f0eb; color: #111; }
  .nav-item.active { background: #eef2ff; color: #4f46e5; font-weight: 700; }

  .card { background: #fff; border-radius: 16px; padding: 24px 28px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #ebebeb; }
  .stat-card { background: #fff; border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #ebebeb; flex: 1; }
  .badge { display: inline-flex; align-items: center; padding: 4px 12px; background: #eef2ff; color: #4f46e5; border-radius: 100px; font-size: 12px; font-weight: 700; }
  .progress-bar { height: 8px; background: #f0f0eb; border-radius: 100px; overflow: hidden; margin-top: 16px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 100px; transition: width 0.8s ease; }

  .page-fade { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .history-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f0f0eb; }
  .history-row:last-child { border-bottom: none; }
  .drop-zone { border: 2px dashed #c7d2fe; border-radius: 16px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: #fafafa; }
  .drop-zone:hover, .drop-zone.drag-over { border-color: #6366f1; background: #eef2ff; }
  .personality-reveal { animation: revealPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  @keyframes revealPop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 18px; color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
  .nav-section-label { font-size: 10px; font-weight: 700; color: #bbb; letter-spacing: 1.2px; text-transform: uppercase; padding: 12px 26px 4px; }
`;

function StyleTag() { return <style dangerouslySetInnerHTML={{ __html: globalCSS }} />; }

/* ─── TOAST ──────────────────────────────────────────────────── */
function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: type === "error" ? "#dc2626" : "#111", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", animation: "fadeIn 0.3s ease" }}>
      {type === "error" ? "❌ " : "✅ "}{msg}
    </div>
  );
}

/* ─── WIZARD SHELL ───────────────────────────────────────────── */
function WizardShell({ step, totalSteps, title, subtitle, maxWidth = 580, children }) {
  return (
    <div className="page-fade" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 20px", background: "linear-gradient(135deg, #f5f5f0 0%, #eef2ff 100%)" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6 }}>Complete Your Profile</h1>
      <p style={{ color: "#888", marginBottom: 24, fontSize: 15 }}>Help us understand your background better</p>
      <div style={{ display: "flex", gap: 6, width: "100%", maxWidth, marginBottom: 8 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 100, background: i < step ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "#e5e5e0", transition: "background 0.3s" }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24, fontWeight: 600 }}>Step {step} of {totalSteps}</p>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
        {title && <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: subtitle ? 6 : 24, color: "#111" }}>{title}</h2>}
        {subtitle && <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────── */
function LoginPage({ onSuccess, onSignup }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      onSuccess(data.token, data.user);
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fade" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f5f5f0 0%, #eef2ff 100%)" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, fontWeight: 800, color: "#fff", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>C</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#111" }}>CareerPath AI</h1>
        <p style={{ color: "#888", marginTop: 6, fontSize: 16 }}>Sign in to your account</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
        {error && <div className="error-box">{error}</div>}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Email</label>
          <input className="form-input" type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Password</label>
          <input className="form-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <button className="btn-primary" onClick={handleLogin} disabled={loading}>{loading ? "Logging in..." : "Login →"}</button>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#888" }}>
          Don't have an account?{" "}
          <span onClick={onSignup} style={{ color: "#6366f1", fontWeight: 700, cursor: "pointer" }}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

/* ─── SIGNUP ─────────────────────────────────────────────────── */
function SignupPage({ onSuccess, onLogin }) {
  const [form, setForm]   = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { setError("All fields are required."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      onSuccess(data.token, data.user);
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name", label: "Full Name", type: "text", placeholder: "John Doe" },
    { key: "email", label: "Email", type: "email", placeholder: "your.email@example.com" },
    { key: "password", label: "Password", type: "password", placeholder: "Create a password (min 6 chars)" },
    { key: "confirm", label: "Confirm Password", type: "password", placeholder: "Confirm your password" },
  ];

  return (
    <div className="page-fade" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f5f5f0 0%, #eef2ff 100%)" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, fontWeight: 800, color: "#fff", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>C</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#111" }}>CareerPath AI</h1>
        <p style={{ color: "#888", marginTop: 6, fontSize: 16 }}>Create your account</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
        {error && <div className="error-box">{error}</div>}
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>{f.label}</label>
            <input className="form-input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
        <div style={{ marginTop: 6 }}>
          <button className="btn-primary" onClick={handleSignup} disabled={loading}>{loading ? "Creating account..." : "Create Account →"}</button>
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#888" }}>
          Already have an account?{" "}
          <span onClick={onLogin} style={{ color: "#6366f1", fontWeight: 700, cursor: "pointer" }}>Login</span>
        </p>
      </div>
    </div>
  );
}

/* ─── PROFILE WIZARD ─────────────────────────────────────────── */
function ProfileWizard({ onComplete }) {
  const { authFetch } = useAuth();
  const [step, setStep]           = useState(1);
  const [data, setData]           = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [currentQ, setCurrentQ]   = useState(0);
  const [quizDone, setQuizDone]   = useState(false);
  const [detectedCareer, setDetectedCareer] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const saveStep1 = async () => {
    if (!data.qualification || !data.year) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    try {
      const res = await authFetch("/api/profile/setup/step1", {
        method: "POST",
        body: JSON.stringify({ qualification: data.qualification, year_of_study: data.year }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to save"); return; }
      setStep(2);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const handleQuizAnswer = (qIndex, option) => {
    const updated = { ...quizAnswers, [qIndex]: option };
    setQuizAnswers(updated);
    if (qIndex < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(qIndex + 1), 300);
    } else {
      const scores = {};
      Object.values(updated).forEach(opt => { opt.tags.forEach(tag => { scores[tag] = (scores[tag] || 0) + 1; }); });
      const topCareer = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      setDetectedCareer(topCareer);
      setData(prev => ({ ...prev, quizCareer: topCareer }));
      setQuizDone(true);
    }
  };

  const saveStep3 = async () => {
    const area  = data.area || data.quizCareer || "";
    const goal  = data.goal || "";
    setLoading(true); setError("");
    try {
      const res = await authFetch("/api/profile/setup/step3", {
        method: "POST",
        body: JSON.stringify({ area_of_interest: area, career_goal: goal }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to save"); return; }
      onComplete(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  if (step === 1) return (
    <WizardShell step={1} totalSteps={3} title="Educational Background">
      {error && <div className="error-box">{error}</div>}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Educational Qualification</label>
        <input className="form-input" placeholder="e.g., B.Tech in Computer Science" value={data.qualification || ""} onChange={e => setData({ ...data, qualification: e.target.value })} />
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Current Year of Study</label>
        <select className="form-select" value={data.year || ""} onChange={e => setData({ ...data, year: e.target.value })}>
          <option value="">Select your year</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-accent" onClick={saveStep1} disabled={loading}>{loading ? "Saving..." : "Continue →"}</button>
      </div>
    </WizardShell>
  );

  if (step === 2) {
    const q = QUIZ_QUESTIONS[currentQ];
    return (
      <WizardShell step={2} totalSteps={3} maxWidth={620}
        title={quizDone ? "🎉 Your Career DNA Revealed!" : `${q.emoji} Question ${currentQ + 1} of ${QUIZ_QUESTIONS.length}`}
        subtitle={quizDone ? "Based on your answers, AI discovered your ideal career path" : q.question}
      >
        {!quizDone ? (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {QUIZ_QUESTIONS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: i <= currentQ ? "#6366f1" : "#e5e5e0", transition: "background 0.3s" }} />
              ))}
            </div>
            {q.options.map((opt, i) => (
              <button key={i} className={`quiz-option ${quizAnswers[currentQ]?.label === opt.label ? "selected" : ""}`} onClick={() => handleQuizAnswer(currentQ, opt)}>
                <span className="opt-dot">{quizAnswers[currentQ]?.label === opt.label && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}</span>
                {opt.label}
              </button>
            ))}
            <div style={{ marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => { if (currentQ > 0) setCurrentQ(currentQ - 1); else setStep(1); }}>← Back</button>
            </div>
          </>
        ) : (
          <div className="personality-reveal">
            <div style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", borderRadius: 16, padding: "28px 24px", textAlign: "center", border: "2px solid #c7d2fe", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🧬</div>
              <p style={{ fontSize: 13, color: "#888", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Your Career DNA</p>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#4f46e5", marginBottom: 8 }}>{detectedCareer}</h3>
              <p style={{ fontSize: 14, color: "#666" }}>Your personality, thinking style, and aspirations all point to this field.</p>
            </div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>You can keep this or change it:</p>
            <select className="form-select" value={data.quizCareer || detectedCareer} onChange={e => setData({ ...data, quizCareer: e.target.value })} style={{ marginBottom: 24 }}>
              {AREAS_OF_INTEREST.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn-ghost" onClick={() => { setQuizDone(false); setCurrentQ(0); setQuizAnswers({}); }}>← Retake Quiz</button>
              <button className="btn-accent" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}
      </WizardShell>
    );
  }

  return (
    <WizardShell step={3} totalSteps={3} title="Career Goals">
      {error && <div className="error-box">{error}</div>}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Area of Interest</label>
        <select className="form-select" value={data.area || data.quizCareer || ""} onChange={e => setData({ ...data, area: e.target.value })}>
          <option value="">Select your area</option>
          {AREAS_OF_INTEREST.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {data.quizCareer && <p style={{ fontSize: 12, color: "#6366f1", marginTop: 6, fontWeight: 600 }}>✨ Pre-filled from your Career DNA quiz</p>}
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Career Interest or Goal</label>
        <textarea className="form-input" placeholder="Describe your career aspirations..." value={data.goal || ""} onChange={e => setData({ ...data, goal: e.target.value })} style={{ minHeight: 100, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
        <button className="btn-accent" onClick={saveStep3} disabled={loading}>{loading ? "Saving..." : "Continue →"}</button>
      </div>
    </WizardShell>
  );
}

/* ─── LINKEDIN PAGE ──────────────────────────────────────────── */
function LinkedInPage({ onComplete, onSkip }) {
  const { authFetch } = useAuth();
  const [url, setUrl]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authFetch("/api/profile/linkedin", { method: "POST", body: JSON.stringify({ linkedin_url: url }) });
    } catch {}
    finally { setLoading(false); onComplete(url); }
  };

  return (
    <div className="page-fade" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f5f5f0 0%, #eef2ff 100%)" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6 }}>LinkedIn Profile</h1>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 15 }}>Add your LinkedIn URL (optional)</p>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 540, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>LinkedIn Profile URL</label>
          <input className="form-input" placeholder="https://www.linkedin.com/in/your-profile" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-secondary" onClick={onSkip}>Skip for now</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save & Continue →"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── RESUME PAGE ────────────────────────────────────────────── */
function ResumePage({ onComplete, onSkip }) {
  const { authFetch } = useAuth();
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") { setError("Please upload a PDF only."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("File too large. Max 5MB."); return; }
    setFile(f); setError("");
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a PDF first."); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await authFetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        headers: {}, // let browser set Content-Type with boundary
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }
      setResult(data.evaluation);
    } catch { setError("Upload failed. Check your connection."); }
    finally { setUploading(false); }
  };

  return (
    <div className="page-fade" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f5f5f0 0%, #eef2ff 100%)" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6 }}>Upload Your Resume</h1>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 15 }}>AI will scan and evaluate it automatically</p>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 580, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
        {error && <div className="error-box">{error}</div>}
        {!result ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#333" }}>Resume (PDF only)</label>
              <div className={`drop-zone ${dragging ? "drag-over" : ""}`} onClick={() => inputRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}>
                <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                {file ? (
                  <div><div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: 15 }}>{file.name}</p>
                    <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB — Click to change</p>
                  </div>
                ) : (
                  <div><div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "#555" }}>Click to upload or drag and drop</p>
                    <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>PDF (MAX. 5MB)</p>
                  </div>
                )}
              </div>
            </div>
            {uploading && (
              <div style={{ background: "#eef2ff", borderRadius: 12, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
                <p style={{ color: "#4f46e5", fontWeight: 700, marginBottom: 10 }}>🤖 AI is reading your resume...</p>
                <div style={{ height: 6, background: "#c7d2fe", borderRadius: 100, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 100, animation: "grow 30s linear forwards" }} />
                </div>
                <style>{`@keyframes grow { from{width:0%} to{width:95%} }`}</style>
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-secondary" onClick={onSkip}>Skip for now</button>
              <button className="btn-primary" onClick={handleUpload} disabled={uploading}>{uploading ? "Analyzing..." : "Analyze Resume →"}</button>
            </div>
          </>
        ) : (
          <div className="personality-reveal">
            <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "20px 24px", border: "1px solid #bbf7d0", marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p style={{ fontWeight: 800, color: "#166534", fontSize: 17 }}>Resume Analyzed Successfully!</p>
              <p style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>Score: <strong>{result.skill_score}/100</strong> — Level: <strong>{result.skill_level}</strong></p>
            </div>
            {result.extracted_skills?.length > 0 && (
              <>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#333" }}>Skills Extracted by AI:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                  {result.extracted_skills.map(skill => (
                    <span key={skill} style={{ padding: "6px 14px", background: "#eef2ff", color: "#4f46e5", borderRadius: 100, fontSize: 13, fontWeight: 700, border: "1px solid #c7d2fe" }}>{skill}</span>
                  ))}
                </div>
              </>
            )}
            <button className="btn-primary" onClick={() => onComplete(result)}>Continue to Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── DASHBOARD ──────────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const { user, authFetch } = useAuth();
  const [activeNav, setActiveNav]     = useState("Dashboard");
  const [dashData, setDashData]       = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [evalArea, setEvalArea]       = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult]   = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [saveMsg, setSaveMsg]         = useState("");
  const [toast, setToast]             = useState(null);
  const [resumeFile, setResumeFile]   = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const resumeInputRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadDashboard = async () => {
    setDashLoading(true);
    try {
      const res  = await authFetch("/api/dashboard");
      const data = await res.json();
      setDashData(data);
      setProfileForm({
        qualification: data.profile?.qualification || "",
        year_of_study: data.profile?.year_of_study || "",
        area_of_interest: data.profile?.area_of_interest || "",
        career_goal: data.profile?.career_goal || "",
      });
    } catch { showToast("Failed to load dashboard", "error"); }
    finally { setDashLoading(false); }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleEvaluate = async () => {
    if (!evalArea) { showToast("Please select an area of interest!", "error"); return; }
    setEvalLoading(true); setEvalResult(null);
    try {
      // First save the area of interest
      await authFetch("/api/profile", { method: "PUT", body: JSON.stringify({ area_of_interest: evalArea }) });
      // Then run evaluation
      const res  = await authFetch("/api/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Evaluation failed", "error"); return; }
      setEvalResult(data.evaluation);
      showToast("Evaluation complete!");
      loadDashboard();
    } catch { showToast("Evaluation failed. Check connection.", "error"); }
    finally { setEvalLoading(false); }
  };

  const handleSaveProfile = async () => {
    try {
      const res  = await authFetch("/api/profile", { method: "PUT", body: JSON.stringify(profileForm) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Save failed", "error"); return; }
      showToast("Profile saved!");
      loadDashboard();
    } catch { showToast("Save failed.", "error"); }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) { showToast("Please select a PDF first.", "error"); return; }
    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res  = await authFetch("/api/resume/upload", { method: "POST", body: formData, headers: {} });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Upload failed", "error"); return; }
      setResumeResult(data.evaluation);
      showToast("Resume analyzed!");
      loadDashboard();
    } catch { showToast("Upload failed.", "error"); }
    finally { setResumeUploading(false); }
  };

  const name       = user?.name || "User";
  const latestEval = dashData?.latest_evaluation;
  const evaluations = dashData?.evaluation_history || [];
  const skillLevel = latestEval?.skill_level || "—";
  const skillScore = latestEval?.skill_score ?? "—";
  const profileCompletion = dashData?.profile_completion || 0;

  const navItems = [
    { label: "Dashboard", icon: "⊞" },
    { label: "Evaluate Profile", icon: "📊" },
    { label: "Upload Resume", icon: "📄" },
    { label: "My Results", icon: "⭐" },
    { label: "Profile Settings", icon: "👤" },
  ];

  if (dashLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f0" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <p style={{ color: "#888", fontWeight: 600 }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f0" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Sidebar */}
      <aside style={{ width: 230, background: "#fff", borderRight: "1px solid #ebebeb", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "24px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>C</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>CareerPath AI</p>
              <p style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{name}</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "4px 0" }}>
          <div className="nav-section-label">Main</div>
          {navItems.map(item => (
            <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => setActiveNav(item.label)}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "16px 20px", border: "none", borderTop: "1px solid #ebebeb", background: "transparent", color: "#999", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          onMouseOver={e => e.currentTarget.style.color = "#111"} onMouseOut={e => e.currentTarget.style.color = "#999"}>
          → Logout
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "40px 48px", overflowY: "auto" }}>

        {/* DASHBOARD */}
        {activeNav === "Dashboard" && (
          <div className="page-fade">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Welcome back, {name}! 👋</h2>
            <p style={{ color: "#888", marginBottom: 28, fontSize: 15 }}>Here's your career development overview</p>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><p style={{ fontWeight: 700, fontSize: 16 }}>Profile Completion</p><p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{profileCompletion < 100 ? "Keep adding info to improve your evaluation" : "Your profile is complete!"}</p></div>
                <span style={{ fontWeight: 800, fontSize: 22, color: "#6366f1" }}>{profileCompletion}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${profileCompletion}%` }} /></div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
              {[
                { icon: "🎯", label: "Total Evaluations", value: String(evaluations.length), color: "#eef2ff" },
                { icon: "📈", label: "Current Skill Score", value: skillScore !== "—" ? `${skillScore}/100` : "—", color: "#f0fdf4" },
                { icon: "✨", label: "Skill Level", value: skillLevel, color: "#fdf4ff" },
              ].map(stat => (
                <div key={stat.label} className="stat-card">
                  <div style={{ width: 40, height: 40, background: stat.color, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{stat.icon}</div>
                  <p style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{stat.label}</p>
                  <p style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {latestEval ? (
              <div className="card">
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>📈 Latest Evaluation</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 36, fontWeight: 800, color: "#6366f1" }}>{latestEval.skill_score} <span style={{ fontSize: 16, fontWeight: 500, color: "#aaa" }}>/ 100</span></p>
                    <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Evaluated on {new Date(latestEval.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <span className="badge" style={{ marginTop: 10 }}>{latestEval.skill_level}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Area of Interest</p>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{latestEval.area_of_interest || "—"}</p>
                    <button className="btn-accent" style={{ marginTop: 14, width: "auto" }} onClick={() => setActiveNav("My Results")}>View Results →</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "40px 28px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                <h3 style={{ fontWeight: 800, marginBottom: 8 }}>No evaluations yet</h3>
                <p style={{ color: "#888", marginBottom: 20 }}>Run your first evaluation to see your skill score and get career recommendations.</p>
                <button className="btn-accent" style={{ width: "auto", margin: "0 auto" }} onClick={() => setActiveNav("Evaluate Profile")}>Start Evaluation →</button>
              </div>
            )}

            {evaluations.length > 0 && (
              <div className="card">
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📅 Evaluation History</p>
                {evaluations.map((ev, i) => (
                  <div key={i} className="history-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, background: "#eef2ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#6366f1", fontSize: 15 }}>{ev.skill_score}</div>
                      <div><p style={{ fontWeight: 600, fontSize: 15 }}>{ev.area_of_interest || "Evaluation"}</p><p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{new Date(ev.created_at).toLocaleDateString()}</p></div>
                    </div>
                    <span className="badge">{ev.skill_level}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => setActiveNav("Evaluate Profile")}>🔄 Evaluate Profile</button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setActiveNav("Upload Resume")}>📄 Upload Resume</button>
              </div>
            </div>
          </div>
        )}

        {/* EVALUATE PROFILE */}
        {activeNav === "Evaluate Profile" && (
          <div className="page-fade">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Evaluate Profile</h2>
            <p style={{ color: "#888", marginBottom: 28, fontSize: 15 }}>Our AI will analyze your profile and give you a skill score + recommendations</p>
            <div className="card">
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Start New Evaluation</p>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Select Area of Interest</label>
                <select className="form-select" value={evalArea} onChange={e => { setEvalArea(e.target.value); setEvalResult(null); }}>
                  <option value="">Select your area</option>
                  {AREAS_OF_INTEREST.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {evalLoading && (
                <div style={{ background: "#eef2ff", borderRadius: 12, padding: "20px 24px", marginBottom: 20, textAlign: "center", color: "#4f46e5", fontWeight: 600 }}>
                  ⏳ AI is evaluating your profile... this may take 15–30 seconds
                </div>
              )}
              {evalResult && !evalLoading && (
                <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px", marginBottom: 20, border: "1px solid #bbf7d0" }}>
                  <p style={{ fontWeight: 800, color: "#166534", fontSize: 16, marginBottom: 4 }}>✅ Evaluation Complete!</p>
                  <p style={{ color: "#166534", fontSize: 14 }}>Score: <strong>{evalResult.skill_score}/100</strong> — Level: <strong>{evalResult.skill_level}</strong></p>
                  <p style={{ color: "#166534", fontSize: 13, marginTop: 6 }}>{evalResult.skill_analysis}</p>
                  <button className="btn-accent" style={{ marginTop: 14, width: "auto" }} onClick={() => setActiveNav("My Results")}>View Full Results →</button>
                </div>
              )}
              <button className="btn-primary" style={{ maxWidth: 240 }} onClick={handleEvaluate} disabled={evalLoading}>{evalLoading ? "Evaluating..." : "Start Evaluation →"}</button>
            </div>
          </div>
        )}

        {/* UPLOAD RESUME */}
        {activeNav === "Upload Resume" && (
          <div className="page-fade">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Upload Resume</h2>
            <p style={{ color: "#888", marginBottom: 28, fontSize: 15 }}>AI will scan your PDF and give you an instant evaluation</p>
            <div className="card">
              {dashData?.has_resume && (
                <div style={{ background: "#eef2ff", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #c7d2fe" }}>
                  <p style={{ color: "#4f46e5", fontWeight: 600, fontSize: 14 }}>📄 Current resume: <strong>{dashData.resume_filename}</strong></p>
                  <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Upload a new file to replace it.</p>
                </div>
              )}
              {!resumeResult ? (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <div className={`drop-zone`} onClick={() => resumeInputRef.current.click()}
                      onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") setResumeFile(f); }}>
                      <input ref={resumeInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setResumeFile(e.target.files[0])} />
                      {resumeFile ? (
                        <div><div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                          <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: 15 }}>{resumeFile.name}</p>
                          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{(resumeFile.size / 1024).toFixed(0)} KB — Click to change</p>
                        </div>
                      ) : (
                        <div><div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
                          <p style={{ fontWeight: 600, fontSize: 15, color: "#555" }}>Click to upload or drag and drop</p>
                          <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>PDF only (MAX. 5MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {resumeUploading && (
                    <div style={{ background: "#eef2ff", borderRadius: 12, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
                      <p style={{ color: "#4f46e5", fontWeight: 700, marginBottom: 10 }}>🤖 AI is reading your resume... (30–60 seconds)</p>
                      <div style={{ height: 6, background: "#c7d2fe", borderRadius: 100, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 100, animation: "grow 60s linear forwards" }} />
                      </div>
                      <style>{`@keyframes grow { from{width:0%} to{width:95%} }`}</style>
                    </div>
                  )}
                  <button className="btn-primary" style={{ maxWidth: 240 }} onClick={handleResumeUpload} disabled={resumeUploading}>{resumeUploading ? "Analyzing..." : "Analyze Resume →"}</button>
                </>
              ) : (
                <div className="personality-reveal">
                  <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "20px 24px", border: "1px solid #bbf7d0", marginBottom: 24, textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                    <p style={{ fontWeight: 800, color: "#166534", fontSize: 17 }}>Resume Analyzed!</p>
                    <p style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>Score: <strong>{resumeResult.skill_score}/100</strong> — {resumeResult.skill_level}</p>
                  </div>
                  {resumeResult.extracted_skills?.length > 0 && (
                    <>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#333" }}>Skills found:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                        {resumeResult.extracted_skills.map(s => (
                          <span key={s} style={{ padding: "6px 14px", background: "#eef2ff", color: "#4f46e5", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>{s}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn-secondary" onClick={() => { setResumeResult(null); setResumeFile(null); }}>Upload Another</button>
                    <button className="btn-primary" onClick={() => setActiveNav("My Results")}>View Full Results →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY RESULTS */}
        {activeNav === "My Results" && (
          <div className="page-fade">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>My Results</h2>
            <p style={{ color: "#888", marginBottom: 28, fontSize: 15 }}>Your latest AI evaluation results</p>
            {latestEval ? (
              <LatestResults evalId={latestEval.id} authFetch={authFetch} />
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h3 style={{ fontWeight: 800, marginBottom: 8 }}>No results yet</h3>
                <p style={{ color: "#888", marginBottom: 20 }}>Complete an evaluation to see your AI-powered career recommendations here.</p>
                <button className="btn-accent" style={{ width: "auto", margin: "0 auto" }} onClick={() => setActiveNav("Evaluate Profile")}>Run Evaluation →</button>
              </div>
            )}
          </div>
        )}

        {/* PROFILE SETTINGS */}
        {activeNav === "Profile Settings" && (
          <div className="page-fade">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Profile Settings</h2>
            <p style={{ color: "#888", marginBottom: 28, fontSize: 15 }}>Update your information to improve evaluation accuracy</p>
            <div className="card">
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Personal Information</p>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Full Name</label>
                <input className="form-input" type="text" value={user?.name || ""} disabled style={{ opacity: 0.6 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Email</label>
                <input className="form-input" type="email" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Qualification</label>
                <input className="form-input" placeholder="e.g., B.Tech Computer Science" value={profileForm.qualification || ""} onChange={e => setProfileForm({ ...profileForm, qualification: e.target.value })} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Year of Study</label>
                <select className="form-select" value={profileForm.year_of_study || ""} onChange={e => setProfileForm({ ...profileForm, year_of_study: e.target.value })}>
                  <option value="">Select year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Area of Interest</label>
                <select className="form-select" value={profileForm.area_of_interest || ""} onChange={e => setProfileForm({ ...profileForm, area_of_interest: e.target.value })}>
                  <option value="">Select area</option>
                  {AREAS_OF_INTEREST.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Career Goal</label>
                <textarea className="form-input" placeholder="Describe your career aspirations..." value={profileForm.career_goal || ""} onChange={e => setProfileForm({ ...profileForm, career_goal: e.target.value })} style={{ minHeight: 90, resize: "vertical" }} />
              </div>
              <button className="btn-primary" style={{ maxWidth: 200 }} onClick={handleSaveProfile}>Save Changes →</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

/* ─── LATEST RESULTS VIEW ────────────────────────────────────── */
function LatestResults({ evalId, authFetch }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`/api/evaluate/${evalId}`)
      .then(r => r.json())
      .then(d => {
        const raw = d.evaluation?.raw_result;
        if (raw) setData(typeof raw === "string" ? JSON.parse(raw) : raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [evalId]);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>⏳ Loading results...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40 }}>No data available.</div>;

  const levelColor = { beginner: "#f59e0b", moderate: "#3b82f6", advanced: "#10b981" }[data.skill_level] || "#6366f1";
  const recs  = data.recommendations || {};
  const items = recs.items || [];

  return (
    <div>
      {/* Score Hero */}
      <div className="card" style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0eb" strokeWidth="8"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke={levelColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - data.skill_score / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ filter: `drop-shadow(0 0 6px ${levelColor})`, transition: "stroke-dashoffset 1.5s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: levelColor }}>{data.skill_score}</span>
            <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>/ 100</span>
          </div>
        </div>
        <div>
          <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 100, background: `${levelColor}20`, color: levelColor, fontWeight: 700, fontSize: 13, marginBottom: 8, border: `1px solid ${levelColor}40` }}>
            {data.skill_level?.toUpperCase()}
          </span>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            {data.skill_level === "beginner" && "Let's build your foundation 🌱"}
            {data.skill_level === "moderate" && "You're ready for opportunities! ⚡"}
            {data.skill_level === "advanced" && "Impressive skills — let's aim high! 🚀"}
          </h3>
          <p style={{ color: "#666", fontSize: 14 }}>{data.skill_analysis}</p>
        </div>
      </div>

      {/* Extracted Skills */}
      {data.extracted_skills?.length > 0 && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📋 Skills Found in Resume</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.extracted_skills.map((s, i) => (
              <span key={i} style={{ padding: "6px 14px", background: "#eef2ff", color: "#4f46e5", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {items.length > 0 && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            {recs.type === "roadmap" && "🗺️ Your Learning Roadmap"}
            {recs.type === "internships" && "💼 Recommended Internships"}
            {recs.type === "jobs" && "🚀 Job Opportunities"}
            {!recs.type && "📌 Recommendations"}
          </p>
          {recs.summary && <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{recs.summary}</p>}
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((item, i) => (
              <div key={i} style={{ border: "1px solid #ebebeb", borderRadius: 14, padding: "18px 20px", background: i === 0 ? "#fafafe" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</p>
                    {item.company && <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>🏢 {item.company}</p>}
                    <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{item.description}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {item.duration && <span style={{ fontSize: 12, background: "#f0f0eb", padding: "3px 10px", borderRadius: 100, color: "#666" }}>⏱ {item.duration}</span>}
                      {item.location && <span style={{ fontSize: 12, background: "#f0f0eb", padding: "3px 10px", borderRadius: 100, color: "#666" }}>📍 {item.location}</span>}
                    </div>
                    {item.required_skills?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {item.required_skills.map((s, j) => (
                          <span key={j} style={{ fontSize: 11, padding: "2px 8px", background: "#eef2ff", color: "#4f46e5", borderRadius: 100, fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: i === 0 ? "#eef2ff" : "#f5f5f0", color: i === 0 ? "#4f46e5" : "#888", fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 100, flexShrink: 0 }}>#{item.priority || i + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Jobs */}
      {data.live_jobs?.length > 0 && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>🌐 Live Job Listings</p>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Real openings from Google Jobs matching your profile</p>
          <div style={{ display: "grid", gap: 14 }}>
            {data.live_jobs.map((job, i) => (
              <div key={i} style={{ border: "1px solid #c7d2fe", borderRadius: 14, padding: "18px 20px", background: "#fafafe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{job.title}</p>
                    {job.company && <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>🏢 {job.company}</p>}
                    {job.description && <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{job.description}</p>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {job.location && <span style={{ fontSize: 12, background: "#f0f0eb", padding: "3px 10px", borderRadius: 100, color: "#666" }}>📍 {job.location}</span>}
                      {job.salary && <span style={{ fontSize: 12, background: "#f0fdf4", padding: "3px 10px", borderRadius: 100, color: "#166534" }}>💰 {job.salary}</span>}
                    </div>
                  </div>
                  <span style={{ background: "#4f46e5", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100, flexShrink: 0 }}>LIVE</span>
                </div>
                {job.url && (
                  <a href={job.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 14, padding: "8px 18px", background: "#111", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    Apply Now →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two col: highlights + improvements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        {data.resume_highlights?.length > 0 && (
          <div className="card" style={{ marginBottom: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>✨ Resume Highlights</p>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {data.resume_highlights.map((h, i) => (
                <li key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#444" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", marginTop: 5, flexShrink: 0 }}/>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.resume_improvements?.length > 0 && (
          <div className="card" style={{ marginBottom: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📝 Resume Improvements</p>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {data.resume_improvements.map((t, i) => (
                <li key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#444" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 5, flexShrink: 0 }}/>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tips */}
      {data.improvement_tips?.length > 0 && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>💡 Tips for Growth</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {data.improvement_tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 12, background: "#f9f9f6", borderRadius: 12, padding: "14px 16px" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: 13, color: "#444" }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── APP ROOT ───────────────────────────────────────────────── */
function AppInner() {
  const { user, login, logout } = useAuth();
  const [screen, setScreen]     = useState(user ? "dashboard" : "login");

  const handleLoginSuccess = (token, userData) => {
    login(token, userData);
    setScreen("dashboard");
  };

  const handleSignupSuccess = (token, userData) => {
    login(token, userData);
    setScreen("profile");
  };

  const handleLogout = () => {
    logout();
    setScreen("login");
  };

  return (
    <>
      <StyleTag />
      {screen === "login"    && <LoginPage  onSuccess={handleLoginSuccess} onSignup={() => setScreen("signup")} />}
      {screen === "signup"   && <SignupPage onSuccess={handleSignupSuccess} onLogin={() => setScreen("login")} />}
      {screen === "profile"  && <ProfileWizard onComplete={() => setScreen("linkedin")} />}
      {screen === "linkedin" && <LinkedInPage onComplete={() => setScreen("resume")} onSkip={() => setScreen("resume")} />}
      {screen === "resume"   && <ResumePage onComplete={() => setScreen("dashboard")} onSkip={() => setScreen("dashboard")} />}
      {screen === "dashboard" && <Dashboard onLogout={handleLogout} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
