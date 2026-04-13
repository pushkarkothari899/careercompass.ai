
# CareerPath AI — Complete Setup Guide

## Project Structure

```
careerpath-ai/
│
├── backend/                ← Flask Python server
│   ├── server.py
│   └── .env                ← Your API keys (already filled)
│
└── frontend/               ← React app
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env                ← Points to backend
    └── src/
        ├── main.jsx
        ├── index.css
        └── App.jsx         ← Main app (fully connected)
```

---

## Step 1 — Install Python packages (backend)

Open a terminal, go to the `backend/` folder:

```bash
cd backend
pip install flask PyJWT pdfplumber
```

---

## Step 2 — Start the backend

```bash
cd backend
python server.py
```

You should see:
```
🚀 CareerPath AI Backend starting on port 5000
```

Test it: open http://localhost:5000 in your browser — you should see JSON.

---

## Step 3 — Install frontend packages

Open a NEW terminal, go to the `frontend/` folder:

```bash
cd frontend
npm install
```

---

## Step 4 — Start the frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser — your app is live!

---

## Both servers must run at the same time

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `python server.py` (in backend/) | http://localhost:5000 |
| Terminal 2 | `npm run dev` (in frontend/) | http://localhost:3000 |

---

## Common Errors

| Error | Fix |
|-------|-----|
| `pip not found` | Use `pip3` instead |
| `ModuleNotFoundError` | Run `pip install flask PyJWT pdfplumber` |
| `npm not found` | Install Node.js from https://nodejs.org |
| `CORS error` in browser | Make sure backend is running on port 5000 |
| AI returns demo data | Check OPENROUTER_API_KEY in backend/.env |
| `401 Unauthorized` | Token expired — log out and log in again |
=======
# careercompass.ai
A full-stack Career Compass application that guides users in choosing career paths, enhances their skills through personalized suggestions, and fetches relevant job opportunities using GPT-3.5 Turbo and SerpAPI
