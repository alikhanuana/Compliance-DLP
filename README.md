# 📘 Complete GitHub README for Compliance DLP

Below is a **professional, ready-to-copy README.md** for your GitHub repository. It covers everything from project overview to step-by-step setup.

---

```markdown
# 🛡️ Compliance DLP – Browser-Native Data Loss Prevention

**Compliance DLP** is a browser-native Data Loss Prevention (DLP) solution that prevents sensitive data from leaving your organization through **copy-paste**, **drag-drop**, **file uploads**, **file downloads**, and **WhatsApp Web** – all without requiring proxies or complex network changes.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-brightgreen)]()
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4)]()

---

## 📖 Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Backend API Setup](#1-backend-api-setup)
  - [2. Chrome Extension Setup](#2-chrome-extension-setup)
  - [3. Configuration](#3-configuration)
- [API Endpoints](#api-endpoints)
- [Logging & Monitoring](#logging--monitoring)
- [Folder Structure](#folder-structure)
- [Technologies Used](#technologies-used)
- [Skills Gained](#skills-gained)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📋 **Clipboard Monitoring** | Inspects copy/paste for PCI, CNIC, SSN, and phone patterns |
| 🖱️ **Drag-Drop Blocking** | Prevents dragging sensitive files into web apps |
| 📁 **File Upload Control** | Blocks uploads >5MB and dangerous file types (.exe, .ps1, .dmg, etc.) |
| ⬇️ **File Download Control** | Blocks downloads >10MB |
| 💬 **WhatsApp Protection** | Blocks pasting sensitive data into WhatsApp Web |
| 🎯 **Risk Scoring** | Each action scored 0–100; actions above 85 are blocked |
| 🔒 **PCI DSS Ready** | Scans for credit card numbers, CVV, SSN, Pakistani CNIC |
| 📝 **Event Logging** | All blocked events logged with timestamp, user, source, risk score |
| 🔌 **REST API** | Centralized policy delivery and event ingestion |
| 🚀 **No Proxy Required** | Works entirely inside the browser |

---

## ⚙️ How It Works

```
User Action (copy/paste/drag/upload/download)
              ↓
    Browser Extension Listener
              ↓
    Content Inspection (Regex + File Scan)
              ↓
       Risk Scoring (0–100)
              ↓
    Risk ≥ 85? → BLOCK + LOG
    Risk < 85? → ALLOW + MONITOR
```

The extension injects JavaScript listeners into every webpage, capturing:
- `oncopy` / `onpaste` events (clipboard)
- `dragstart` / `drop` events
- File input `onchange` events
- WhatsApp Web DOM mutations

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chrome        │     │   Your Server   │     │   Log Files     │
│   Extension     │────▶│   extension.php │────▶│  dlp_events.log │
│  (JavaScript)   │     │     (PHP API)    │     │ pci_violations.log│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
   User's Browser           Admin Dashboard
   (Real-time blocking)     (View stats/logs)
```

---

## 📋 Prerequisites

- **Web Server** (Apache/Nginx) with PHP 7.4+
- **Write permissions** on the server directory (for log files)
- **Google Chrome** or **Microsoft Edge** (for extension)
- **Basic knowledge** of Chrome extension loading (Developer mode)

---

## 🚀 Installation

### 1. Backend API Setup

**Step 1:** Upload `extension.php` to your web server

Create a new file called `extension.php` on your server (e.g., `/var/www/html/compliance-dlp/extension.php`).

**Step 2:** Copy the complete API code

Use the full `extension.php` code provided in the [`api/extension.php`](api/extension.php) file of this repository.

**Step 3:** Set your API key

Open `extension.php` and change this line:
```php
$API_SECRET_KEY = "your-secret-key-change-this";
```
Replace with a strong, random key (e.g., `kL7$9mN2#pQ5&rT8`).

**Step 4:** Set directory permissions

```bash
chmod 755 /path/to/your/directory
chmod 666 /path/to/your/directory/dlp_events.log
```

**Step 5:** Test the API

```bash
curl -H "X-API-Key: your-secret-key" "https://yourdomain.com/extension.php?action=get_policy"
```

Expected response:
```json
{"success":true,"policy":{"upload_size_limit_mb":5,...}}
```

---

### 2. Chrome Extension Setup

**Step 1:** Create extension folder structure

```
compliance-dlp-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── icon128.png
```

**Step 2:** Create `manifest.json`

```json
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "128": "icon128.png"
    }
  },
  "icons": {
    "128": "icon128.png"
  }
}
```

**Step 3:** Create `content.js` (Core DLP Logic)

```javascript
// Configuration
const API_URL = "https://yourdomain.com/extension.php";
const API_KEY = "your-secret-key-change-this";

// Fetch policy on load
let policy = null;
let blacklistedDomains = [];

async function loadPolicy() {
    const response = await fetch(`${API_URL}?action=get_policy`, {
        headers: { "X-API-Key": API_KEY }
    });
    const data = await response.json();
    if (data.success) {
        policy = data.policy;
        blacklistedDomains = data.blacklisted_domains;
    }
}
loadPolicy();

// PCI Pattern Detection
const PCI_PATTERNS = {
    credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    cnic: /\b\d{5}-\d{7}-\d\b/,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
    phone: /\b(?:\+?92|0)?3[0-9]{2}-?[0-9]{7}\b/
};

function detectSensitiveData(text) {
    for (const [type, pattern] of Object.entries(PCI_PATTERNS)) {
        if (pattern.test(text)) {
            return { detected: true, type, risk: 95 };
        }
    }
    return { detected: false, risk: 0 };
}

// Block Clipboard Paste
document.addEventListener('paste', async (e) => {
    if (!policy) return;
    
    const pastedText = e.clipboardData.getData('text');
    const detection = detectSensitiveData(pastedText);
    
    if (detection.detected && detection.risk >= policy.risk_threshold) {
        e.preventDefault();
        e.stopPropagation();
        
        // Log event
        await fetch(`${API_URL}?action=log_event`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({
                user_email: await getUserEmail(),
                action: "clipboard_paste",
                source: window.location.hostname,
                risk_score: detection.risk,
                reason: `PCI DSS sensitive data detected: ${detection.type}`,
                file_name: "",
                file_size_mb: 0
            })
        });
        
        alert("Blocked: PCI sensitive data cannot be pasted here.");
    }
});

// Block File Uploads
document.addEventListener('change', async (e) => {
    if (e.target.type !== 'file') return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    const fileSizeMB = file.size / (1024 * 1024);
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileSizeMB > policy.upload_size_limit_mb) {
        e.preventDefault();
        e.target.value = '';
        alert(`Blocked: File exceeds ${policy.upload_size_limit_mb}MB limit.`);
        return;
    }
    
    if (policy.blocked_extensions.includes(fileExt)) {
        e.preventDefault();
        e.target.value = '';
        alert(`Blocked: ${fileExt} files are not allowed.`);
        return;
    }
    
    // Read file content for PCI scan
    const reader = new FileReader();
    reader.onload = async function(evt) {
        const content = evt.target.result;
        const detection = detectSensitiveData(content);
        
        if (detection.detected && detection.risk >= policy.risk_threshold) {
            e.target.value = '';
            alert(`Blocked: File contains ${detection.type} data.`);
            
            await fetch(`${API_URL}?action=log_event`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
                body: JSON.stringify({
                    user_email: await getUserEmail(),
                    action: "file_upload",
                    source: window.location.hostname,
                    risk_score: detection.risk,
                    reason: `PCI sensitive data in file: ${detection.type}`,
                    file_name: file.name,
                    file_size_mb: fileSizeMB
                })
            });
        }
    };
    reader.readAsText(file);
});

// Helper: Get user email (from storage or popup)
async function getUserEmail() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail'], (result) => {
            resolve(result.userEmail || 'unknown');
        });
    });
}
```

**Step 4:** Create a simple `popup.html`

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { width: 300px; padding: 15px; font-family: Arial, sans-serif; }
        .status { color: green; font-weight: bold; }
        button { width: 100%; padding: 10px; margin-top: 10px; }
    </style>
</head>
<body>
    <h3>🛡️ Compliance DLP</h3>
    <p>Status: <span class="status">✅ Active</span></p>
    <p>Policy loaded from server</p>
    <input type="email" id="userEmail" placeholder="Enter your email" style="width:100%; padding:8px;">
    <button id="saveEmail">Save Email</button>
    <script src="popup.js"></script>
</body>
</html>
```

**Step 5:** Load extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select your extension folder
5. Extension is now active

---

### 3. Configuration

Edit these values in `extension.php` (backend) and `content.js` (frontend):

| Variable | Default | Description |
|----------|---------|-------------|
| `upload_size_limit_mb` | 5 | Max file upload size in MB |
| `download_size_limit_mb` | 10 | Max file download size in MB |
| `risk_threshold` | 85 | Actions with risk ≥ this value are blocked |
| `blocked_extensions` | exe, ps1, bat, vbs, dmg, iso, scr, com, pif, cmd, jar, apk, msi | Dangerous file types |
| `blacklisted_domains` | pastebin.com, dropbox.com, etc. | Domains where actions are blocked |

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=get_policy` | GET | Returns current DLP policy and blacklisted domains |
| `?action=log_event` | POST | Logs a blocked event (clipboard, file, etc.) |
| `?action=validate_license` | POST | Validates user email/license |
| `?action=get_stats` | GET | Returns total blocked, today blocked, PCI violations |

**Authentication:** All requests require `X-API-Key` header.

---

## 📝 Logging & Monitoring

Logs are stored as JSONL (one JSON object per line):

**`dlp_events.log`** – All blocked events
```json
{"timestamp":"2026-05-05 13:09:00","user_email":"user@company.com","action":"clipboard_paste","source":"web.whatsapp.com","risk_score":95,"reason":"PCI DSS sensitive data in clipboard: Credit Card Number","ip_address":"192.168.1.100"}
```

**`pci_violations.log`** – Only PCI-related violations

---

## 📁 Folder Structure

```
compliance-dlp/
├── api/
│   └── extension.php          # Backend API endpoint
├── extension/
│   ├── manifest.json          # Chrome extension manifest
│   ├── content.js             # Core DLP logic
│   ├── background.js          # Service worker
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic
│   └── icon128.png            # Extension icon
├── logs/
│   ├── dlp_events.log         # All blocked events
│   └── pci_violations.log     # PCI-specific violations
└── README.md                  # This file
```

---

## 🛠️ Technologies Used

| Layer | Technology |
|-------|------------|
| **Frontend (Extension)** | JavaScript, Chrome Extension APIs (Manifest V3) |
| **Backend** | PHP 7.4+ (native, no frameworks) |
| **Logging** | JSONL (JSON Lines format) |
| **Pattern Detection** | Regex (PCRE) |
| **API Authentication** | API Key (X-API-Key header) |

---

## 🧠 Skills Gained

Building this project teaches you:

| Domain | Skills |
|--------|--------|
| **Data Loss Prevention** | DLP policy design, content inspection, channel monitoring |
| **Insider Risk Management** | User activity monitoring, anomaly detection, exfiltration prevention |
| **PCI DSS Compliance** | Requirement 3,4,10; cardholder data pattern detection |
| **Browser Security** | Extension-based controls, event interception, DOM manipulation |
| **Threat Detection** | Risk scoring, regex pattern matching, threshold-based blocking |
| **Security Logging** | JSONL audit trails, forensic metadata capture |
| **API Security** | Key authentication, input validation, CORS hardening |

---

## 📸 Screenshots

*(Add your actual screenshots here)*

| Dashboard | Blocked Event | Extension Popup |
|-----------|---------------|-----------------|
| ![Dashboard](screenshots/dashboard.png) | ![Blocked](screenshots/blocked.png) | ![Popup](screenshots/popup.png) |

---

## 🗺️ Roadmap

- [ ] Add support for Firefox (WebExtensions API)
- [ ] Add database backend (MySQL) for production scaling
- [ ] Build admin dashboard UI (React/Vue)
- [ ] Add email alerts for high-risk violations
- [ ] Support for more PII patterns (GDPR, HIPAA)
- [ ] Machine learning-based risk scoring

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information.

---

## 🙏 Acknowledgements

- Chrome Extension documentation
- PCI Security Standards Council
- Regex patterns from open-source DLP projects

---

## 📧 Contact

**Project Maintainer:** Mudassar Ali Raja  
**Email:** alikhanuana@gmail.com
**LinkedIn:** [Your LinkedIn Profile]  


---

## ⭐ Show Your Support

If this project helped you, please give it a ⭐ on GitHub!

---

**Built with 🔒 in mind. Protect your data before it leaves.**
```

---

## 📌 Additional Files to Create

For a complete repo, also add these files:

### `LICENSE` (MIT)
```
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

### `.gitignore`
```
logs/*.log
.idea/
.vscode/
.DS_Store
*.zip
```

### `api/extension.php` (the complete PHP code from earlier)

---

Would you like me to also provide:
1. **A demo video script** for your GitHub README?
2. **The complete extension ZIP file** structure as a downloadable template?
3. **A step-by-step video tutorial script** for installing the entire system?
