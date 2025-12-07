import { useState, useRef, useEffect } from "react";
import { Shield, FileText, Activity, AlertTriangle, BookOpen } from "lucide-react";
import ChatMessage from "../components/ChatMessage";
import QuickActionButton from "../components/QuickActionButton";
import MessageInput from "../components/MessageInput";
import Footer from "../components/Footer";

/**
 * FINAL MERGED App.jsx (priority: App.jsx)
 * - Includes ALL functionality from both original App.jsx and Chat.jsx
 * - File-report flow, evidence uploads, risk analysis, OLLAMA chat, quick actions
 * - Uses import paths exactly as App.jsx did (./components/...)
 */

/* ---------------- CONFIG ---------------- */
const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL_NAME = "phi3";

const PRAISE_MESSAGES = ["Great, thank you!", "Excellent.", "Got it.", "Perfect, thanks.", "Nice."];

/* Restore the full system prompt from original App.jsx (priority #1) */
const RISK_ANALYSIS_SYSTEM_PROMPT = `
You are a cybersecurity forensics and risk analysis engine.

Input will be a JSON report from file scanners, malware scanners, forensic tools or security modules.

Your job:
- Detect if there is any cyber threat or risky indicator.
- Identify the attack type (examples: malware, steganography, image tampering, unauthorized access, phishing, data exfiltration, benign/no threat).
- Generate a RISK SCORE between 0 and 100.
- Derive a RISK CATEGORY from the score:
  - 0–19    → "Informational"
  - 20–39   → "Low"
  - 40–59   → "Medium"
  - 60–79   → "High"
  - 80–100  → "Critical"
- Set PRIORITY: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
- Decide if the user should be alerted (true / false).
- Provide a short bullet-point summary of findings.

Respond **ONLY in valid JSON** using exactly this schema:

{
  "risk_score": number,
  "risk_category": "Informational" | "Low" | "Medium" | "High" | "Critical",
  "attack_type": string,
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "should_alert_user": boolean,
  "summary": [string, ...]
}

Never add text outside JSON.
`.trim();
const PLAYBOOK_SYSTEM_PROMPT = `
You are a CERT (Computer Emergency Response Team) incident response expert.

Input: A JSON object that ALREADY contains:
- risk_score
- risk_category
- priority
- attack_type
- summary

Your task:
Generate a professional CERT incident response PLAYBOOK for this incident.

Requirements:
- The playbook must be understandable by non-technical users AND useful for security teams.
- Use clear headings and bullet points.
- Do NOT return JSON.
- Do NOT explain what you are doing.
- Only output the playbook.

Format:

🚨 CERT Incident Response Playbook — {attack_type}
Priority: {priority} | Risk: {risk_category} ({risk_score}/100)

🔍 Executive Summary (non-technical)
• Simple explanation of what happened and impact

📌 Affected Areas
• Who or what might be impacted

1️⃣ Detection & Validation
• Steps to confirm the incident
• Logs / evidence to review

2️⃣ Containment
• Immediate actions to limit damage
• Short-term and long-term containment ideas

3️⃣ Forensic Investigation
• What to collect and analyze
• Questions to answer

4️⃣ Eradication & Remediation
• How to remove the threat
• How to close the hole used by the attacker

5️⃣ Recovery & Validation
• Steps to safely restore systems/users
• Checks before saying "incident is over"

6️⃣ Reporting / Legal / Compliance
• Who should be informed
• Possible reporting or documentation needs

7️⃣ Lessons Learned & Prevention
• How to avoid similar incidents in future
• Training / policy / control improvements

Use simple language where possible, but keep it professional.
`.trim();


/* ---------------- UTIL: simplify big scanner reports ---------------- */
function simplifyScannerReport(report) {
  if (!report || typeof report !== "object") return report;
  const cleaned = { ...report };

  if (cleaned.perceptual_embeddings) {
    cleaned.perceptual_embeddings = {
      vector_model: cleaned.perceptual_embeddings.vector_model || null,
    };
  }

  if (cleaned.feature_vector_summary) {
    cleaned.feature_vector_summary = {
      numeric_vector: cleaned.feature_vector_summary.numeric_vector?.slice(0, 8) || [],
      vector_description: cleaned.feature_vector_summary.vector_description || [],
    };
  }

  if (cleaned.ocr_and_text?.full_text) {
    cleaned.ocr_and_text = {
      full_text: cleaned.ocr_and_text.full_text.slice(0, 5000),
    };
  }

  if (cleaned.faces?.faces) {
    cleaned.faces = {
      face_count: cleaned.faces.face_count || cleaned.faces.faces.length,
      faces: cleaned.faces.faces.map((f) => ({ bbox: f.bbox })),
    };
  }

  return cleaned;
}

/* ---------------- FILE REPORT FIELD DEFINITIONS ---------------- */
const FILE_REPORT_FIELDS = [
  { key: "name", question: "What is your full name?", min: 3, max: 50 },
  { key: "role", question: "Select your role:", min: 5, max: 40 },
  { key: "department", question: "Enter your Department / Unit:", min: 2, max: 50 },
  { key: "location", question: "Enter your Location / Station:", min: 2, max: 50 },
  { key: "complaintType", question: "What is the complaint type?", min: 3, max: 50 },
  { key: "incidentDate", question: "Select the incident date:", min: 8, max: 10 },
  { key: "incidentTime", question: "Select the incident time:", min: 4, max: 5 },
  { key: "description", question: "Describe the incident in detail:", min: 20, max: 500 },
  {
    key: "suspectedSource",
    question: 'Who or what is the suspected source? (you can write "unknown")',
    min: 3,
    max: 100,
  },
];

/* =================== APP COMPONENT =================== */
function App() {
  /* ---------------- STATE ---------------- */
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm Cyber AI Assistant, your 24/7 cybersecurity support system.",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isFileReportActive, setIsFileReportActive] = useState(false);
  const [fileReportStep, setFileReportStep] = useState(0);
  const [isEvidenceStep, setIsEvidenceStep] = useState(false);
  const [isRiskAnalysisMode, setIsRiskAnalysisMode] = useState(false);
  // 👉 NEW: Playbook mode flag
const [isPlaybookMode, setIsPlaybookMode] = useState(false);

  const [fileReportData, setFileReportData] = useState({
    name: "",
    role: "",
    department: "",
    location: "",
    complaintType: "",
    incidentDate: "",
    incidentTime: "",
    description: "",
    suspectedSource: "",
    evidence: [],
  });

  const chatContainerRef = useRef(null);

  /* ---------------- SCROLL ---------------- */
  const scrollToBottom = () => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ---------------- PUSH AI MESSAGE ---------------- */
  const pushAiMessage = (text) => {
    const msg = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  /* ---------------- PROCESS FILE REPORT ANSWER ---------------- */
  const processFileReportAnswer = (userText) => {
    if (isEvidenceStep) {
      if (userText.toLowerCase() !== "done") {
        pushAiMessage("Please upload any evidence using the attachment button. When finished, type 'done'.");
        return;
      }

      // Finalize and show JSON
      const finalPayload = { ...fileReportData };
      pushAiMessage(JSON.stringify(finalPayload, null, 2));

      // reset
      setIsFileReportActive(false);
      setIsEvidenceStep(false);
      setFileReportStep(0);
      return;
    }

    const field = FILE_REPORT_FIELDS[fileReportStep];
    if (!field) {
      // no more fields -> evidence step
      setIsEvidenceStep(true);
      pushAiMessage("Now please upload any evidence files (images/documents). When finished, type 'done'.");
      return;
    }

    const len = userText.length;
    if (field.min && len < field.min) {
      pushAiMessage(`Too short. Min ${field.min} characters.`);
      return;
    }
    if (field.max && len > field.max) {
      pushAiMessage(`Too long. Max ${field.max} characters.`);
      return;
    }

    if (field.key === "incidentDate" && !/^\d{4}-\d{2}-\d{2}$/.test(userText)) {
      pushAiMessage("Use date format YYYY-MM-DD.");
      return;
    }

    if (field.key === "incidentTime" && !/^\d{2}:\d{2}$/.test(userText)) {
      pushAiMessage("Use time format HH:MM.");
      return;
    }

    setFileReportData((prev) => ({ ...prev, [field.key]: userText }));

    if (field.key === "name") pushAiMessage(`Nice to meet you, ${userText}.`);
    else pushAiMessage(PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)]);

    const nextIndex = fileReportStep + 1;
    if (nextIndex < FILE_REPORT_FIELDS.length) {
      setFileReportStep(nextIndex);
      pushAiMessage(FILE_REPORT_FIELDS[nextIndex].question);
    } else {
      setIsEvidenceStep(true);
      pushAiMessage("Upload evidence now. Type 'done' when finished.");
    }
  };

  /* ---------------- FIELD SELECTION (role/date/time quick pick) ---------------- */
  const handleFieldSelection = (selectedValue) => {
    if (!selectedValue) return;
    // Add user message showing the selection
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        text: selectedValue,
        sender: "user",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    processFileReportAnswer(selectedValue);
  };

  /* ---------------- HANDLE FILES UPLOAD FROM INPUT ----------------
     - create attachments preview
     - add to messages
     - if in file-report/evidence step, update fileReportData.evidence
  */
  const handleSendFiles = (files) => {
    if (!files || files.length === 0) return;

    const attachments = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}-${file.name}`,
      type: file.type.startsWith("image/") ? "image" : "file",
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      // optionally you can attach the original File object under `file` if you plan to upload to server:
      // file
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        text: attachments.length === 1 ? `📎 Evidence: ${attachments[0].name}` : `📎 ${attachments.length} files uploaded`,
        sender: "user",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        attachments,
      },
    ]);

    // update fileReportData if active
    if (isFileReportActive) {
      setFileReportData((prev) => ({
        ...prev,
        evidence: [
          ...prev.evidence,
          ...attachments.map((a) => ({ id: a.id, name: a.name, size: a.size, mimeType: a.mimeType, url: a.url })),
        ],
      }));

      if (isEvidenceStep) {
        pushAiMessage("✅ Evidence received! Upload more files or type 'done' to submit.");
      }
    }
  };

  /* ---------------- SEND MESSAGE (text) ---------------- */
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    setInputValue("");

    const userMessage = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
      // --------------------------------------------------
  // 📘 PLAYBOOK MODE (CERT-STYLE)
  // --------------------------------------------------
  if (isPlaybookMode) {
    let parsed;

    // Validate JSON
    try {
      parsed = JSON.parse(userText);
    } catch {
      pushAiMessage("❌ Invalid JSON. Please paste valid JSON.");
      return;
    }

    // Required fields from Risk Analysis
    const required = ["risk_score", "risk_category", "priority", "attack_type", "summary"];
    const missing = required.filter(f => parsed[f] === undefined);

    if (missing.length > 0) {
      pushAiMessage(
        "⚠ Missing fields: " + missing.join(", ") +
        ".\nRun Risk Analysis first, then paste its JSON here."
      );
      return;
    }

    pushAiMessage("📘 Generating CERT incident response playbook...");

    try {
      const res = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL_NAME,
          messages: [
            { role: "system", content: PLAYBOOK_SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(parsed, null, 2) }
          ],
          stream: false
        })
      });

      const data = await res.json();
      const aiText =
        data?.message?.content ||
        data?.response ||
        "❌ Failed to generate playbook.";

      pushAiMessage(aiText);
    } catch (err) {
      console.error("Playbook Error:", err);
      pushAiMessage("❌ Error while generating playbook.");
    }

    return; // do NOT continue to file report / risk / chat
  }


    // FILE REPORT MODE
    if (isFileReportActive) {
      processFileReportAnswer(userText);
      return;
    }

    // RISK ANALYSIS MODE
    if (isRiskAnalysisMode) {
      let parsed;
      try {
        parsed = JSON.parse(userText);
      } catch {
        pushAiMessage("❌ Invalid JSON. Please paste valid JSON only.");
        return;
      }

      const simplified = simplifyScannerReport(parsed);
      let jsonString = JSON.stringify(simplified, null, 2);

      const MAX_JSON_CHARS = 9000;
      if (jsonString.length > MAX_JSON_CHARS) {
        jsonString = jsonString.slice(0, MAX_JSON_CHARS) + "\n\n[⚠ Data truncated for safe processing]";
      }

      pushAiMessage("⏳ Analyzing report... please wait.");

      try {
        const res = await fetch(OLLAMA_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OLLAMA_MODEL_NAME,
            messages: [
              { role: "system", content: RISK_ANALYSIS_SYSTEM_PROMPT },
              { role: "user", content: `Analyze this security report and respond ONLY with valid JSON:\n\n${jsonString}` },
            ],
            stream: false,
          }),
        });

        if (!res.ok) {
          pushAiMessage(`❌ Server error: ${res.status}`);
          return;
        }

        const data = await res.json();
        let aiText = data?.message?.content || "";

        if (!aiText.trim()) {
          pushAiMessage("❌ AI returned empty response.");
          return;
        }

        // attempt to extract JSON from assistant response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          pushAiMessage("❌ AI response does not contain valid JSON.\n\nRaw response:\n" + aiText.substring(0, 500));
          return;
        }

        const jsonResponse = jsonMatch[0];
        try {
          const validated = JSON.parse(jsonResponse);
          const required = ["risk_score", "risk_category", "attack_type", "priority", "should_alert_user", "summary"];
          const missing = required.filter((f) => !(f in validated));
          if (missing.length > 0) {
            pushAiMessage(`⚠️ Missing fields in response: ${missing.join(", ")}`);
            return;
          }
          pushAiMessage(JSON.stringify(validated, null, 2));
        } catch (parseErr) {
          pushAiMessage("❌ Invalid JSON in response: " + parseErr.message);
        }
      } catch (err) {
        console.error("Risk Analysis Error:", err);
        pushAiMessage(`❌ Connection failed:\n${err.message}`);
      }
      return;
    }

    // NORMAL CHAT MODE
    try {
      const lastMsgs = [...messages, userMessage]
        .slice(-8)
        .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

      const res = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL_NAME, messages: lastMsgs, stream: false }),
      });

      const data = await res.json();
      const aiText = data?.message?.content || "Sorry, I couldn't generate a response.";
      pushAiMessage(aiText);
    } catch (err) {
      console.error("Chat error:", err);
      pushAiMessage("❌ Failed to reach AI server.");
    }
  };

  /* ---------------- QUICK ACTIONS ---------------- */
  const handleQuickAction = (action) => {
    if (action === "File Report") {
      setIsFileReportActive(true);
      setIsEvidenceStep(false);
      setFileReportStep(0);
      setIsRiskAnalysisMode(false);

      setFileReportData({
        name: "",
        role: "",
        department: "",
        location: "",
        complaintType: "",
        incidentDate: "",
        incidentTime: "",
        description: "",
        suspectedSource: "",
        evidence: [],
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "📄 File Report initiated",
          sender: "user",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      // ask first question after a short delay
      setTimeout(() => {
        pushAiMessage(FILE_REPORT_FIELDS[0].question);
      }, 200);
      return;
    }

    if (action === "Risk Analysis") {
      setIsRiskAnalysisMode(true);
      setIsFileReportActive(false);
      setIsEvidenceStep(false);
      setFileReportStep(0);
      pushAiMessage("🛡 Risk Analysis activated.\nPaste the JSON incident report and press Send.");
      return;
    }
    
  if (action === "Playbooks") {
    setIsPlaybookMode(true);
    setIsRiskAnalysisMode(false);
    setIsFileReportActive(false);
    setIsEvidenceStep(false);
    setFileReportStep(0);

    pushAiMessage(
      "📘 Playbook mode activated.\nPlease paste the JSON that already contains risk_score, risk_category, priority, attack_type, and summary. Then press Send."
    );
    return;
  }

    // fallback
    pushAiMessage(`${action} feature not implemented yet.`);
  };

  /* ---------------- WHICH FIELD KEY IS CURRENT ---------------- */
  const currentFieldKey = isFileReportActive && !isEvidenceStep ? FILE_REPORT_FIELDS[fileReportStep]?.key : undefined;

  /* ---------------- RENDER JSX ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F2F3] via-[#EEEEEE] to-[#E8E8E8] flex flex-col">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#002B5C] via-[#003366] to-[#1B3A5F] border-b-4 border-[#0066CC] py-6 px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="bg-gradient-to-br from-[#0078D4] to-[#00BCD4] p-3 rounded-lg shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">Cyber AI Assistant</h1>
            <p className="text-[#7D9CB7] text-sm mt-1">24/7 intelligent support for incident response</p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6">
        <div className="bg-white rounded-lg shadow-2xl border border-[#7D9CB7]/30 overflow-hidden flex flex-col" style={{ height: "82vh" }}>
          {/* MESSAGE LIST */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                showRoleDropdown={
                  isFileReportActive &&
                  !isEvidenceStep &&
                  currentFieldKey === "role" &&
                  message.sender === "ai" &&
                  message.text &&
                  message.text.toLowerCase().includes("select your role")
                }
                showDatePicker={
                  isFileReportActive && !isEvidenceStep && currentFieldKey === "incidentDate" && message.sender === "ai"
                }
                showTimePicker={
                  isFileReportActive && !isEvidenceStep && currentFieldKey === "incidentTime" && message.sender === "ai"
                }
                onFieldSelect={handleFieldSelection}
                onQuickAnswer={handleFieldSelection} // support both callback names
              />
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="px-6 py-5 bg-gradient-to-r from-[#F2F2F3] to-[#EEEEEE] border-t-2">
            <h3 className="text-[#2C3E50] text-sm font-bold mb-3 uppercase">Quick Actions:</h3>
            <div className="grid grid-cols-4 gap-3">
              <QuickActionButton icon={<FileText className="w-5 h-5" />} label="File Report" onClick={() => handleQuickAction("File Report")} />
              <QuickActionButton icon={<Activity className="w-5 h-5" />} label="Check Status" onClick={() => handleQuickAction("Check Status")} />
              <QuickActionButton icon={<AlertTriangle className="w-5 h-5" />} label="Risk Analysis" onClick={() => handleQuickAction("Risk Analysis")} />
              <QuickActionButton icon={<BookOpen className="w-5 h-5" />} label="Playbooks" onClick={() => handleQuickAction("Playbooks")} />
            </div>
          </div>

          {/* SAFETY NOTE */}
          <div className="px-6 py-4">
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold">AI suggestion – verify before applying</span>
            </div>
          </div>

          {/* INPUT */}
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onSendFiles={handleSendFiles}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
