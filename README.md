# 🎯 GapSync — AI-Based Skill Gap Analysis & Career Recommendation Engine

> *"Know your gaps. Own your future."*

GapSync is an AI-powered career intelligence platform that compares student skill profiles against real-time industry benchmarks, identifies gaps, and generates hyper-personalized learning roadmaps — in seconds.

---

## 🚀 The Problem

Every year, millions of engineering graduates enter the job market **without knowing what they're missing**. They apply to roles they're not prepared for. They study the wrong things. Recruiters reject them without explanation. Career counselors are expensive and scarce.

**GapSync solves this with AI.**

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Readiness Score** | 0–100 score showing real job readiness vs. industry standard |
| 🔍 **Gap Identification** | Color-coded critical/high/medium gaps with fix timelines |
| 🗺 **Learning Roadmap** | 3-phase, week-by-week plan with specific platforms & resources |
| 🛠 **Project Ideas** | Recruiter-impressive project suggestions with exact tech stacks |
| 🔀 **Career Alternatives** | AI-suggested alternative paths with compatibility scores |
| 💬 **AI Mentor Messages** | Personalized motivational guidance powered by LLaMA 3.3 70B |
| 📈 **Market Intelligence** | Live demand scores, salary ranges, top hiring companies |

---

## 🏗 Architecture

```
GapSync/
├── backend/                    # Express + MongoDB + Groq AI
│   ├── config/db.js            # Mongoose connection
│   ├── controllers/analyzeGap.js  # Core AI engine & prompt
│   ├── models/Student.js       # Student schema
│   ├── models/IndustryRole.js  # Industry benchmarks schema
│   ├── routes/apiRoutes.js     # REST API routes
│   └── server.js               # Express server
├── frontend/
│   └── index.html              # Single-file interactive dashboard
└── README.md
```

### Tech Stack
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **AI**: Groq API → LLaMA 3.3 70B Versatile (ultra-fast inference)
- **Frontend**: Vanilla HTML/CSS/JS (zero dependencies)
- **Database**: MongoDB Atlas (cloud) or local MongoDB

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Fill in your GROQ_API_KEY and MONGO_URI

npm run dev  # starts on http://localhost:5000
```

### Frontend Setup

```bash
# Just open the file in a browser with Live Server (VS Code extension)
# OR use:
cd frontend
npx serve .
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/roles` | All available career tracks |
| POST | `/api/analyze` | **Main AI analysis endpoint** |
| POST | `/api/save-profile` | Save student profile to DB |

#### POST /api/analyze
```json
{
  "studentProfile": {
    "name": "Alex Kumar",
    "education": { "degree": "B.Tech CS", "year": 3, "cgpa": 7.8 },
    "skills": [
      { "name": "Python", "level": "intermediate" },
      { "name": "React", "level": "beginner" }
    ],
    "certifications": ["AWS Cloud Practitioner"],
    "projects": [{ "title": "Portfolio", "description": "Built a React portfolio..." }]
  },
  "targetRole": "Full Stack Developer"
}
```

---

## 🏆 Why GapSync Wins

1. **Real data** — Benchmarks from actual job listings, not guesswork
2. **Actionable output** — Not "learn Python" but "Complete Python for Data Science on Coursera, 40 hours, must-do"
3. **Full stack** — Database + AI + beautiful UI, production-ready
4. **Fast** — Groq's LPU inference gives results in ~3 seconds
5. **Scalable** — Add more roles, integrate LinkedIn jobs API, add auth

---

## 👥 Team

Built with ❤️ for the Hackathon

---

*GapSync — Because guessing your career gaps is not a strategy.*
