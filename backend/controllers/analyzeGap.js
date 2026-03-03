// =============================================================================
// backend/controllers/analyzeGap.js
// GapSync — AI Skill Gap Analysis Controller
// -----------------------------------------------------------------------------
// Flow:
//   1. Receive student profile + target role from the request body
//   2. Fetch the target role's required skills from MongoDB (IndustryRole model)
//   3. Compute the raw skill gap (set difference) deterministically — no AI needed
//   4. Build a tight, structured prompt and send to Groq (llama-3.2 model)
//   5. Fall back to Ollama (local) if Groq fails or is unavailable
//   6. Parse + validate the LLM JSON, then return it to the frontend
// =============================================================================

"use strict";

const Groq = require("groq-sdk");
const IndustryRole = require("../models/IndustryRole");

// ── Clients ──────────────────────────────────────────────────────────────────

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY, // set in .env
});

// Ollama runs a local OpenAI-compatible HTTP server (default: port 11434).
// We reuse Groq SDK's base-URL override — no extra dependency needed.
const ollamaClient = new Groq({
  apiKey: "ollama",                          // Ollama ignores the key
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
});

// ── Constants ─────────────────────────────────────────────────────────────────

const GROQ_MODEL   = "llama-3.3-70b-versatile"; // fast + capable
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2"; // local model tag
const MAX_TOKENS   = 2048;
const TEMPERATURE  = 0.2; // low = deterministic JSON, minimal hallucination

// ── System Prompt ─────────────────────────────────────────────────────────────
//
// Rules encoded in the prompt:
//   • Return ONLY raw JSON — no markdown fences, no prose, no apologies
//   • Follow the exact schema (validated after parsing)
//   • roadmap phases must be ordered (1 → 2 → 3)
//   • Each task must be atomic and actionable (not vague)
//   • Resource URLs must be real and publicly accessible
//
const SYSTEM_PROMPT = `
You are GapSync's career intelligence engine. Your ONLY job is to return a single, raw JSON object.

STRICT OUTPUT RULES — violating any rule makes your response useless:
1. Output MUST start with '{' and end with '}'.
2. NO markdown code fences (\`\`\`json or \`\`\`).
3. NO explanatory text before or after the JSON.
4. NO trailing commas. All strings must use double quotes.
5. Every field listed in the schema below is REQUIRED. Never omit a field.
6. Arrays must have at least one item unless the schema explicitly says they may be empty.

REQUIRED JSON SCHEMA:
{
  "targetRole": string,                  // exact role name as given
  "overallReadinessScore": number,       // 0–100 integer
  "readinessLabel": string,              // one of: "Beginner" | "Developing" | "Intermediate" | "Advanced" | "Job-Ready"
  "executiveSummary": string,            // 2–3 sentences, honest & motivating, addressed to the student
  "identifiedGaps": [                    // skills the student is MISSING; empty array [] only if no gaps
    {
      "skill": string,                   // exact technology / concept name
      "urgency": string,                 // "critical" | "high" | "medium" | "low"
      "currentLevel": string,            // "missing" | "beginner" | "intermediate" | "advanced"
      "requiredLevel": string,           // "beginner" | "intermediate" | "advanced" | "expert"
      "whyItMatters": string,            // one sentence: business / hiring impact
      "estimatedLearningWeeks": number   // realistic integer, 1–24
    }
  ],
  "confirmedStrengths": [                // skills the student HAS that match role requirements
    {
      "skill": string,
      "currentLevel": string,
      "roleRelevance": string            // one sentence: why this strength matters for the role
    }
  ],
  "learningRoadmap": {
    "totalDurationWeeks": number,        // sum of all phase durations
    "phases": [
      {
        "phase": number,                 // 1, 2, or 3
        "title": string,                 // e.g. "Foundation Sprint"
        "objective": string,             // one sentence goal for this phase
        "durationWeeks": number,
        "tasks": [
          {
            "taskId": string,            // format: "P{phase}-T{n}", e.g. "P1-T1"
            "title": string,             // concise action title
            "type": string,              // "course" | "project" | "practice" | "certification" | "reading"
            "description": string,       // 1–2 sentences: what exactly to do and why
            "platform": string,          // specific platform name, e.g. "fast.ai", "LeetCode", "Coursera"
            "resourceUrl": string,       // real, publicly accessible URL
            "estimatedHours": number,    // integer
            "priority": string,          // "must-do" | "recommended" | "optional"
            "skillsCovered": [string]    // list of gap skills this task addresses
          }
        ]
      }
    ]
  },
  "projectRecommendations": [
    {
      "title": string,
      "description": string,             // 2–3 sentences: what to build and what it demonstrates to recruiters
      "techStack": [string],
      "difficultyLevel": string,         // "beginner" | "intermediate" | "advanced"
      "estimatedWeeks": number,
      "recruiterImpactNote": string      // one sentence: why this impresses hiring managers
    }
  ],
  "careerAlternatives": [               // 2–3 adjacent roles the student is closer to right now
    {
      "role": string,
      "compatibilityScore": number,      // 0–100 integer
      "rationale": string,               // one sentence
      "estimatedSalaryRangeINR": string  // e.g. "₹8L – ₹18L per annum"
    }
  ],
  "motivationalNote": string            // 1–2 sentences, energising, personalised to the target role
}

Think step-by-step internally, but output ONLY the final JSON object.
`.trim();

// ── Helper: compute skill gap deterministically ───────────────────────────────
//
// Returns three sets derived from simple string comparison (case-insensitive):
//   missingSkills   — required by the role, absent from student profile
//   matchedSkills   — present in both student profile and role requirements
//   extraSkills     — student has them but they're not formally required
//
function computeSkillGap(studentSkills = [], requiredSkills = []) {
  const normalise = (s) => s.trim().toLowerCase();

  const studentSet  = new Set(studentSkills.map(normalise));
  const requiredSet = new Set(requiredSkills.map((r) => normalise(r.name || r)));

  const missingSkills = [...requiredSet].filter((s) => !studentSet.has(s));
  const matchedSkills = [...requiredSet].filter((s) =>  studentSet.has(s));
  const extraSkills   = [...studentSet].filter((s) =>  !requiredSet.has(s));

  return { missingSkills, matchedSkills, extraSkills };
}

// ── Helper: build the user-turn message ──────────────────────────────────────
//
// Injects deterministic gap data so the LLM doesn't have to figure out
// what's missing — it only generates the roadmap and scoring.
//
function buildUserMessage({ studentProfile, roleData, gapData }) {
  return `
STUDENT PROFILE:
- Name: ${studentProfile.name || "Student"}
- Education: ${studentProfile.education?.degree || "Not specified"}, Year ${studentProfile.education?.year || "?"}, CGPA ${studentProfile.education?.cgpa || "?"}
- Self-Reported Skills: ${studentProfile.skills.map((s) => s.name || s).join(", ") || "None listed"}
- Certifications: ${(studentProfile.certifications || []).join(", ") || "None"}
- Projects (summary): ${studentProfile.projects?.map((p) => p.title || p).join("; ") || "None described"}

TARGET ROLE: ${roleData.title}
ROLE CATEGORY: ${roleData.category}
MARKET DEMAND SCORE: ${roleData.demandScore}/100
SALARY RANGE: ₹${(roleData.avgSalary?.min / 100000).toFixed(1)}L – ₹${(roleData.avgSalary?.max / 100000).toFixed(1)}L per annum
TOP HIRING COMPANIES: ${(roleData.topCompanies || []).join(", ")}

PRE-COMPUTED SKILL GAP (use as ground truth — do NOT contradict this):
- MISSING SKILLS (core of identifiedGaps): ${gapData.missingSkills.join(", ") || "None — student meets all requirements"}
- MATCHED SKILLS (use for confirmedStrengths): ${gapData.matchedSkills.join(", ") || "None matched"}
- BONUS SKILLS the student has (extra context only): ${gapData.extraSkills.join(", ") || "None"}

FULL ROLE REQUIREMENTS (with importance levels):
${JSON.stringify(roleData.requiredSkills, null, 2)}

TASK: Generate the complete GapSync JSON analysis following the exact schema in your system instructions.
`.trim();
}

// ── Helper: call LLM with a given client + model ──────────────────────────────

async function callLLM(client, model, userMessage) {
  const response = await client.chat.completions.create({
    model,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" }, // enforced by both Groq & Ollama
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userMessage  },
    ],
  });

  return response.choices[0]?.message?.content;
}

// ── Helper: parse + validate LLM output ──────────────────────────────────────
//
// Strips accidental markdown fences (belt-and-suspenders), then validates
// that all top-level required keys are present before returning.
//
const REQUIRED_TOP_LEVEL_KEYS = [
  "targetRole",
  "overallReadinessScore",
  "readinessLabel",
  "executiveSummary",
  "identifiedGaps",
  "confirmedStrengths",
  "learningRoadmap",
  "projectRecommendations",
  "careerAlternatives",
  "motivationalNote",
];

function parseAndValidate(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("LLM returned an empty or non-string response.");
  }

  // Strip markdown code fences if the model disobeyed the rules
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (jsonErr) {
    throw new Error(`LLM output is not valid JSON. Snippet: ${cleaned.slice(0, 300)}`);
  }

  const missing = REQUIRED_TOP_LEVEL_KEYS.filter((k) => !(k in parsed));
  if (missing.length > 0) {
    throw new Error(`LLM JSON missing required keys: ${missing.join(", ")}`);
  }

  // Clamp readiness score to valid range
  parsed.overallReadinessScore = Math.min(
    100,
    Math.max(0, Math.round(parsed.overallReadinessScore))
  );

  return parsed;
}

// ── Main Controller ───────────────────────────────────────────────────────────
//
// POST /api/analyze
// Body: { studentProfile: { name, education, skills, certifications, projects }, targetRole: string }
//
const analyzeGap = async (req, res) => {
  const { studentProfile, targetRole } = req.body;

  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!studentProfile || !targetRole) {
    return res.status(400).json({
      success: false,
      error: "Both `studentProfile` and `targetRole` are required in the request body.",
    });
  }

  const studentSkills = (studentProfile.skills || []).map((s) =>
    typeof s === "string" ? s : s.name
  );

  if (studentSkills.length === 0) {
    return res.status(400).json({
      success: false,
      error: "`studentProfile.skills` must contain at least one skill.",
    });
  }

  // ── 2. Fetch role benchmark from MongoDB ───────────────────────────────────
  let roleData;
  try {
    roleData = await IndustryRole.findOne({
      title: { $regex: new RegExp(`^${targetRole.trim()}$`, "i") },
    }).lean();
  } catch (dbErr) {
    console.error("[GapSync] DB error:", dbErr.message);
    return res.status(503).json({
      success: false,
      error: "Database unavailable. Please try again shortly.",
    });
  }

  if (!roleData) {
    return res.status(404).json({
      success: false,
      error: `Role "${targetRole}" not found. Fetch available roles from GET /api/roles.`,
    });
  }

  // ── 3. Deterministic gap computation ──────────────────────────────────────
  const requiredSkillNames = (roleData.requiredSkills || []).map(
    (s) => s.name || s
  );
  const gapData = computeSkillGap(studentSkills, requiredSkillNames);

  const userMessage = buildUserMessage({ studentProfile, roleData, gapData });

  // ── 4. LLM inference — Groq first, Ollama fallback ────────────────────────
  let rawLLMOutput;
  let engineUsed = "groq";

  try {
    console.log(`[GapSync] → Groq (${GROQ_MODEL})`);
    rawLLMOutput = await callLLM(groqClient, GROQ_MODEL, userMessage);
  } catch (groqErr) {
    console.warn(`[GapSync] Groq failed (${groqErr.message}). Falling back to Ollama...`);
    engineUsed = "ollama";
    try {
      console.log(`[GapSync] → Ollama (${OLLAMA_MODEL})`);
      rawLLMOutput = await callLLM(ollamaClient, OLLAMA_MODEL, userMessage);
    } catch (ollamaErr) {
      console.error("[GapSync] Both engines failed.", ollamaErr.message);
      return res.status(502).json({
        success: false,
        error: "Both AI engines are currently unavailable. Please retry in a moment.",
        ...(process.env.NODE_ENV === "development" && {
          debug: { groq: groqErr.message, ollama: ollamaErr.message },
        }),
      });
    }
  }

  // ── 5. Parse & validate LLM output ────────────────────────────────────────
  let analysis;
  try {
    analysis = parseAndValidate(rawLLMOutput);
  } catch (parseErr) {
    console.error("[GapSync] Parse/validation error:", parseErr.message);
    return res.status(422).json({
      success: false,
      error: "AI returned malformed data. Please retry.",
      ...(process.env.NODE_ENV === "development" && {
        debug: { parseError: parseErr.message, raw: rawLLMOutput?.slice(0, 500) },
      }),
    });
  }

  // ── 6. Build final response envelope and return ────────────────────────────
  // ── 6. Build final response envelope and return ────────────────────────────
  return res.status(200).json({
    success: true,
    overallReadinessScore: analysis.overallReadinessScore,
    readinessLabel: analysis.readinessLabel,
    roleMetadata: { title: roleData.title },
    executiveSummary: analysis.executiveSummary,
    topCompaniesToTarget: roleData.topCompanies,
    estimatedTimeToJobReady: `${analysis.learningRoadmap?.totalDurationWeeks || 8} Weeks`,
    
    criticalGaps: (analysis.identifiedGaps || []).map(g => ({
      skill: g.skill,
      urgency: g.urgency,
      whyItMatters: g.whyItMatters,
      currentLevel: g.currentLevel,
      requiredLevel: g.requiredLevel,
      fixInWeeks: g.estimatedLearningWeeks
    })),
    
    strengths: (analysis.confirmedStrengths || []).map(s => ({
      skill: s.skill,
      insight: s.roleRelevance
    })),
    
    learningRoadmap: (analysis.learningRoadmap?.phases || []).map(p => ({
      phase: p.phase,
      title: p.title,
      durationWeeks: p.durationWeeks,
      focus: p.objective,
      tasks: p.tasks || []
    })),
    
    projectIdeas: (analysis.projectRecommendations || []).map(p => ({
      title: p.title,
      description: p.description,
      techStack: p.techStack || [],
      impressFactor: p.recruiterImpactNote
    })),
    
    careerAlternatives: (analysis.careerAlternatives || []).map(a => ({
      role: a.role,
      compatibilityScore: a.compatibilityScore,
      reason: a.rationale,
      salaryRange: a.estimatedSalaryRangeINR
    })),
    
    motivationalMessage: analysis.motivationalNote
  });
};

module.exports = { analyzeGap };
