🛡️ Compliance DLP – Browser-Native Data Loss Prevention System

A real-time browser-native Data Loss Prevention (DLP) system that prevents sensitive data leaks via clipboard, file uploads, downloads, drag-and-drop, and web applications like WhatsApp Web — without proxies or network agents.

📖 Table of Contents
Overview
Features
How It Works
Architecture
Prerequisites
Installation
API Endpoints
Logging & Audit System
Folder Structure
Security Model
Technologies Used
Use Cases
Roadmap
License
Contact
🧠 Overview

Compliance DLP is a browser-native security layer that prevents sensitive data from leaving an organization.

It monitors:

Clipboard (copy/paste)
File uploads
File downloads
Drag & drop actions
WhatsApp Web usage
Web form inputs

It detects:

Credit Card Numbers (PCI DSS)
CNIC (Pakistan identity)
SSN (US)
Phone numbers
Sensitive file types
✨ Features
🔐 Active DLP Controls
Capability	Function
Upload Blocking	Blocks files > 5MB
Download Blocking	Blocks files > 10MB
Risk Scoring	0–100 (≥85 blocked)
PCI Content Scan	Detects card numbers, SSN, CNIC
Domain Blacklisting	Blocks unsafe domains
Extension Blocking	exe, ps1, bat, vbs, dmg, iso, jar, apk
Drag-Drop Protection	Prevents file leakage
Clipboard Control	Blocks sensitive copy/paste
WhatsApp Protection	Blocks pasting PCI data
⚙️ How It Works
User Action (copy / paste / upload / download / drag-drop)
                ↓
Browser Extension Listener (JS)
                ↓
Content Inspection Engine (Regex + File Scan)
                ↓
Risk Scoring System (0–100)
                ↓
Decision Engine
     ├── Risk ≥ 85 → BLOCK + LOG
     └── Risk < 85 → ALLOW + MONITOR
🏗️ Architecture
┌────────────────────┐
│ Chrome Extension   │
│ (content.js)       │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Risk Engine        │
│ Regex + Scanner    │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ PHP API            │
│ extension.php      │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Logs & Monitoring  │
│ JSONL Files        │
└────────────────────┘
📋 Prerequisites
PHP 7.4+
Apache / Nginx server
Chrome / Edge browser
Extension developer mode enabled
Write permissions for logs directory
🚀 Installation Guide
1️⃣ Backend Setup (API)

Create file:

/api/extension.php

Set API key:

$API_SECRET_KEY = "your-secret-key-change-this";

Set permissions:

chmod 755 /var/www/html
chmod 666 /var/www/html/logs/*

Test API:

curl -H "X-API-Key: your-secret-key" \
"https://yourdomain.com/api/extension.php?action=get_policy"
2️⃣ Chrome Extension Setup
Structure
compliance-dlp/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── icons/
manifest.json
{
  "manifest_version": 3,
  "name": "Compliance DLP",
  "version": "1.0",
  "description": "Browser-native Data Loss Prevention",
  "permissions": ["storage", "clipboardRead", "clipboardWrite"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "128": "icon128.png" }
  }
}
3️⃣ Core DLP Engine (content.js)
PCI Pattern Detection
const PCI_PATTERNS = {
  credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/,
  cnic: /\b\d{5}-\d{7}-\d\b/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  phone: /\b(?:\+?92|0)?3[0-9]{2}-?[0-9]{7}\b/
};
Clipboard Protection
document.addEventListener('paste', async (e) => {
  const text = e.clipboardData.getData('text');

  for (const [type, pattern] of Object.entries(PCI_PATTERNS)) {
    if (pattern.test(text)) {
      e.preventDefault();

      await fetch(API_URL, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: JSON.stringify({
          action: "clipboard_paste",
          risk_score: 95,
          reason: `PCI detected: ${type}`
        })
      });

      alert("Blocked: Sensitive data detected.");
      return;
    }
  }
});
File Upload Protection
Size limit: 5MB
Extension blocking
Content scanning
4️⃣ Popup UI
<h3>🛡️ Compliance DLP</h3>
<p>Status: Active</p>
<input type="email" id="email" placeholder="Enter email">
<button>Save</button>
🔌 API ENDPOINTS
Endpoint	Method	Description
get_policy	GET	Fetch security rules
log_event	POST	Store violations
get_stats	GET	Dashboard data
validate_license	POST	User validation
🧾 LOGGING SYSTEM
Event Log Format
{
  "timestamp": "2026-05-05",
  "user": "user@company.com",
  "action": "clipboard_paste",
  "source": "web.whatsapp.com",
  "risk_score": 95,
  "reason": "PCI detected"
}
📁 PROJECT STRUCTURE
compliance-dlp/
├── api/
│   └── extension.php
├── compliance.dlp/
│   ├── content.js
│   ├── background.js
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── icons/
├── data/
│   ├── dlp_users.json
│   ├── dlp_data.json
├── index.html
└── README.md
🔐 SECURITY MODEL
Browser-level interception
Regex-based detection engine
Risk scoring (0–100)
API key authentication
Real-time blocking
🧠 TECHNOLOGIES USED
JavaScript (Chrome Extension MV3)
PHP 7.4+
Regex Engine
JSON Logging
Fetch API
DOM Event Hooks
🏢 USE CASES
Banking & Finance (PCI DSS compliance)
Healthcare (HIPAA-ready adaptation)
Contact Centers
Government data protection
Remote workforce monitoring
🗺️ ROADMAP
AI-based anomaly detection
MySQL backend logging
React admin dashboard
SIEM integration
Firefox support
Email alerts system
📄 LICENSE

MIT License © 2026

🙌 SUMMARY

Compliance DLP = Browser-native enterprise data protection system

It blocks:

Clipboard leaks
File uploads
Downloads
Drag-drop
Sensitive web actions
