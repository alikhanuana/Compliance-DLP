<div align="center">

<br/>

```
 ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ██╗ █████╗ ███╗   ██╗ ██████╗███████╗    ██████╗ ██╗     ██████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║     ██║██╔══██╗████╗  ██║██╔════╝██╔════╝    ██╔══██╗██║     ██╔══██╗
██║     ██║   ██║██╔████╔██║██████╔╝██║     ██║███████║██╔██╗ ██║██║     █████╗      ██║  ██║██║     ██████╔╝
██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██║██╔══██║██║╚██╗██║██║     ██╔══╝      ██║  ██║██║     ██╔═══╝
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗██║██║  ██║██║ ╚████║╚██████╗███████╗    ██████╔╝███████╗██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝    ╚═════╝ ╚══════╝╚═╝
```

**Browser-Native Data Loss Prevention**

*Clipboard control · Drag & drop Inspection · File upload/download enforcement · WhatsApp protection · PCI DSS compliance*

<br/>

[![JavaScript](https://img.shields.io/badge/JavaScript-MV3%20Extension-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.chrome.com/docs/extensions/)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![Chrome](https://img.shields.io/badge/Chrome%20%7C%20Edge-Supported-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)]()
[![PCI DSS](https://img.shields.io/badge/PCI%20DSS-Ready-22c55e?style=for-the-badge)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

> A **proxy-free, browser-native DLP solution** — intercept and block sensitive data exfiltration through copy-paste, drag-drop, file uploads, file downloads, and WhatsApp Web, enforced entirely inside the browser with a centralized PHP policy API and JSONL audit logging.

<br/>

---

</div>

<br/>

## ◈ Table of Contents

- [Overview](#-overview)
- [What It Blocks](#-what-it-blocks)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Logging & Monitoring](#-logging--monitoring)
- [Risk Scoring](#-risk-scoring)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

<br/>

---

## ◈ Overview

Compliance DLP is a **zero-proxy, browser-native** Data Loss Prevention system. Instead of sitting between the network and the internet, it injects JavaScript listeners directly into every webpage — intercepting sensitive data at the point of user action before it ever leaves the browser tab.

Policy rules and risk thresholds are served from a centralized PHP API, making the extension configurable without redeployment. All blocked events are logged with full forensic metadata to JSONL audit files on the server.

**No network proxy. No traffic decryption. No complex infrastructure.**

<br/>

---

## ◈ What It Blocks

Eight interception channels with independently configured risk weights.

<br/>

| # | Channel | Trigger | Risk Score | Enforcement |
|---|---------|---------|:----------:|-------------|
| 1 | **Clipboard Paste** | `oncopy` / `onpaste` events | 95 | Block + log if PCI data detected |
| 2 | **Drag & Drop** | `dragstart` / `drop` events | 90 | Block sensitive file drops into web apps |
| 3 | **File Upload — Size** | `<input type="file">` change | 70 | Block files exceeding 5 MB |
| 4 | **File Upload — Type** | Extension whitelist check | 80 | Block `.exe .ps1 .bat .vbs .dmg .iso` and more |
| 5 | **File Upload — Content** | Inline file content scan | 95 | Block if PCI patterns found inside file |
| 6 | **File Download — Size** | `beforeunload` / link intercept | 65 | Block downloads exceeding 10 MB |
| 7 | **WhatsApp Web** | DOM mutation observer | 95 | Block pasting sensitive data into chat |
| 8 | **Blacklisted Domains** | `window.location` check | 85 | Block all data actions on restricted domains |

**PCI pattern coverage:** Credit cards (Visa · Mastercard · Amex · Discover) · SSN · Pakistani CNIC · Phone numbers

<br/>

---

## ◈ How It Works

```
            User Action  (paste / drag / upload / download)
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │      Browser Extension Listener      │
            │      (injected into every page)      │
            └──────────────┬───────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │        Content Inspection            │
            │   Regex patterns  ·  File scan       │
            │   PCI · SSN · CNIC · Phone           │
            └──────────────┬───────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │          Risk Scoring (0–100)        │
            │   Type weight  +  Context factors    │
            └──────────┬───────────────────────────┘
                       │
                 ┌─────┴──────┐
                 │            │
              Score ≥ 85   Score < 85
                 │            │
                 ▼            ▼
              BLOCK        ALLOW
              + LOG        + MONITOR
                 │
                 ▼
            POST /extension.php?action=log_event
                 │
                 ▼
            dlp_events.log  ·  pci_violations.log
```

<br/>

---

## ◈ Architecture

```
┌──────────────────────────┐
│      Chrome / Edge       │
│                          │
│  ┌────────────────────┐  │
│  │  content.js        │  │         ┌───────────────────────────┐
│  │  (event listeners) │  │──POST──▶│   extension.php (PHP API)│
│  │  (PCI detection)   │  │◀─GET───│   Policy · Log ingestion  │
│  └────────────────────┘  │         └──────────────┬────────────┘
│  ┌────────────────────┐  │                        │
│  │  background.js     │  │                ┌───────┴────────┐
│  │  (service worker)  │  │                │   Log Files    │
│  └────────────────────┘  │                │                │
│  ┌────────────────────┐  │                │ dlp_events.log │
│  │  popup.html/js     │  │                │ pci_violations │
│  │  (user config)     │  │                │    .log        │
│  └────────────────────┘  │                └────────────────┘
└──────────────────────────┘
```

<br/>

---

## ◈ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/compliance-dlp.git
cd compliance-dlp

# 2. Deploy backend to your web server
cp api/extension.php /var/www/html/compliance-dlp/

# 3. Set permissions
chmod 755 /var/www/html/compliance-dlp/
chmod 666 /var/www/html/compliance-dlp/dlp_events.log

# 4. Load extension in Chrome
# → chrome://extensions/ → Developer mode ON → Load unpacked → select /extension
```

<br/>

---

## ◈ Installation

### Part 1 — Backend API (PHP)

**1. Upload `extension.php`** to your server:

```
/var/www/html/compliance-dlp/extension.php
```

**2. Set your API key** — open `extension.php` and replace:

```php
$API_SECRET_KEY = "your-secret-key-change-this";
// Replace with a strong random key, e.g.: kL7$9mN2#pQ5&rT8xZ
```

**3. Set directory permissions:**

```bash
chmod 755 /path/to/compliance-dlp/
chmod 666 /path/to/compliance-dlp/dlp_events.log
```

**4. Verify the API is responding:**

```bash
curl -H "X-API-Key: your-secret-key" \
  "https://yourdomain.com/compliance-dlp/extension.php?action=get_policy"
```

Expected response:

```json
{
  "success": true,
  "policy": {
    "upload_size_limit_mb": 5,
    "download_size_limit_mb": 10,
    "risk_threshold": 85,
    "blocked_extensions": ["exe", "ps1", "bat", "vbs", "dmg"]
  }
}
```

<br/>

### Part 2 — Chrome Extension

**1. Extension folder structure:**

```
extension/
├── manifest.json
├── content.js       ← Core DLP logic
├── background.js    ← Service worker
├── popup.html       ← Toolbar popup UI
├── popup.js
├── styles.css
└── icon128.png
```

**2. `manifest.json`:**

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
    "default_icon": { "128": "icon128.png" }
  }
}
```

**3. `content.js` — Core DLP engine:**

```javascript
const API_URL = "https://yourdomain.com/compliance-dlp/extension.php";
const API_KEY  = "your-secret-key-change-this";

let policy = null;
let blacklistedDomains = [];

// Load policy on page load
async function loadPolicy() {
    const res  = await fetch(`${API_URL}?action=get_policy`, {
        headers: { "X-API-Key": API_KEY }
    });
    const data = await res.json();
    if (data.success) {
        policy             = data.policy;
        blacklistedDomains = data.blacklisted_domains;
    }
}
loadPolicy();

// PCI pattern registry
const PCI_PATTERNS = {
    credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    cnic:        /\b\d{5}-\d{7}-\d\b/,
    ssn:         /\b\d{3}-\d{2}-\d{4}\b/,
    phone:       /\b(?:\+?92|0)?3[0-9]{2}-?[0-9]{7}\b/
};

function detectSensitiveData(text) {
    for (const [type, pattern] of Object.entries(PCI_PATTERNS)) {
        if (pattern.test(text)) return { detected: true, type, risk: 95 };
    }
    return { detected: false, risk: 0 };
}

async function logEvent(action, source, riskScore, reason, fileName = "", fileSizeMb = 0) {
    await fetch(`${API_URL}?action=log_event`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({
            user_email:   await getUserEmail(),
            action, source, risk_score: riskScore,
            reason, file_name: fileName, file_size_mb: fileSizeMb
        })
    });
}

// Clipboard paste interception
document.addEventListener('paste', async (e) => {
    if (!policy) return;
    const text      = e.clipboardData.getData('text');
    const detection = detectSensitiveData(text);
    if (detection.detected && detection.risk >= policy.risk_threshold) {
        e.preventDefault();
        e.stopPropagation();
        await logEvent('clipboard_paste', window.location.hostname,
            detection.risk, `PCI data detected: ${detection.type}`);
        alert("Blocked: Sensitive data cannot be pasted here.");
    }
});

// File upload interception
document.addEventListener('change', async (e) => {
    if (e.target.type !== 'file' || !policy) return;
    const file      = e.target.files[0];
    if (!file) return;
    const sizeMb    = file.size / (1024 * 1024);
    const ext       = file.name.split('.').pop().toLowerCase();

    if (sizeMb > policy.upload_size_limit_mb) {
        e.target.value = '';
        return alert(`Blocked: File exceeds ${policy.upload_size_limit_mb}MB limit.`);
    }
    if (policy.blocked_extensions.includes(ext)) {
        e.target.value = '';
        return alert(`Blocked: .${ext} files are not permitted.`);
    }

    const reader   = new FileReader();
    reader.onload  = async (evt) => {
        const detection = detectSensitiveData(evt.target.result);
        if (detection.detected && detection.risk >= policy.risk_threshold) {
            e.target.value = '';
            await logEvent('file_upload', window.location.hostname,
                detection.risk, `PCI data in file: ${detection.type}`, file.name, sizeMb);
            alert(`Blocked: File contains ${detection.type} data.`);
        }
    };
    reader.readAsText(file);
});

async function getUserEmail() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail'], (r) => resolve(r.userEmail || 'unknown'));
    });
}
```

**4. `popup.html` — Toolbar UI:**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { width: 300px; padding: 15px; font-family: Arial, sans-serif; }
        .status { color: #16a34a; font-weight: bold; }
        input, button { width: 100%; padding: 8px; margin-top: 8px; box-sizing: border-box; }
    </style>
</head>
<body>
    <h3>Compliance DLP</h3>
    <p>Status: <span class="status">Active</span></p>
    <input type="email" id="userEmail" placeholder="Enter your email">
    <button id="saveEmail">Save Email</button>
    <script src="popup.js"></script>
</body>
</html>
```

**5. Load the extension:**

```
chrome://extensions/
  → Enable Developer mode (top-right toggle)
  → Click "Load unpacked"
  → Select the /extension folder
```

The DLP shield is now active on every tab.

<br/>

---

## ◈ Configuration

All policy values are served dynamically from the PHP API. Update `extension.php` to change enforcement rules without redeploying the extension.

| Variable | Default | Description |
|----------|:-------:|-------------|
| `upload_size_limit_mb` | `5` | Maximum allowed file upload size |
| `download_size_limit_mb` | `10` | Maximum allowed file download size |
| `risk_threshold` | `85` | Actions at or above this score are blocked |
| `blocked_extensions` | `exe ps1 bat vbs dmg iso scr com pif cmd jar apk msi` | Dangerous file types — always blocked regardless of size |
| `blacklisted_domains` | `pastebin.com dropbox.com` | Domains where all data actions are enforced at maximum sensitivity |

### Custom PCI patterns

Add domain-specific patterns to the `PCI_PATTERNS` object in `content.js`:

```javascript
const PCI_PATTERNS = {
    // existing patterns...
    employee_id: /\bEMP-[0-9]{6}\b/,
    account_number: /\bACC-[A-Z]{2}-[0-9]{8}\b/
};
```

<br/>

---

## ◈ API Reference

All requests require the `X-API-Key` header. Requests without a valid key return `HTTP 403`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `?action=get_policy` | Returns active DLP policy and blacklisted domains |
| `POST` | `?action=log_event` | Ingests a blocked event with full forensic metadata |
| `POST` | `?action=validate_license` | Validates user email and license entitlement |
| `GET` | `?action=get_stats` | Returns aggregate counts: total blocked, today, PCI violations |

### Request examples

```bash
# Fetch active policy
curl -H "X-API-Key: your-secret-key" \
  "https://yourdomain.com/compliance-dlp/extension.php?action=get_policy"

# Log a blocked event
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "user_email": "analyst@company.com",
    "action": "clipboard_paste",
    "source": "web.whatsapp.com",
    "risk_score": 95,
    "reason": "Credit card number detected",
    "file_name": "",
    "file_size_mb": 0
  }' \
  "https://yourdomain.com/compliance-dlp/extension.php?action=log_event"

# Get statistics
curl -H "X-API-Key: your-secret-key" \
  "https://yourdomain.com/compliance-dlp/extension.php?action=get_stats"
```

<br/>

---

## ◈ Logging & Monitoring

All events are persisted as **JSONL** (one JSON object per line) for easy streaming, grep, and SIEM ingestion.

### `dlp_events.log` — all blocked events

```json
{"timestamp":"2026-05-05 13:09:00","user_email":"user@company.com","action":"clipboard_paste","source":"web.whatsapp.com","risk_score":95,"reason":"PCI DSS sensitive data: credit_card","ip_address":"192.168.1.100"}
{"timestamp":"2026-05-05 14:22:11","user_email":"analyst@company.com","action":"file_upload","source":"drive.google.com","risk_score":95,"reason":"PCI data in file: ssn","file_name":"payroll_q1.csv","file_size_mb":1.2}
```

### `pci_violations.log` — PCI-specific subset

Same format, filtered to only records where `reason` references a PCI pattern. Use this log for PCI DSS Requirement 10 audit submissions.

### Querying logs

```bash
# All critical events today
grep "$(date +%Y-%m-%d)" dlp_events.log | jq 'select(.risk_score >= 90)'

# All WhatsApp violations
grep "whatsapp" dlp_events.log | wc -l

# Events by user
grep "user@company.com" dlp_events.log | jq '.action' | sort | uniq -c
```

<br/>

---

## ◈ Risk Scoring

Each interception channel has a base risk weight. Context modifiers adjust the final score.

| Event Type | Base Score | PCI Match | Blacklisted Domain | Final (example) |
|-----------|:----------:|:---------:|:-----------------:|:---------------:|
| Clipboard paste | 40 | +55 | +10 | **95** |
| File upload — content | 40 | +55 | — | **95** |
| File upload — blocked ext | 80 | — | — | **80** |
| File upload — oversized | 60 | — | — | **70** |
| File download — oversized | 55 | — | — | **65** |
| Drag & drop | 50 | +40 | — | **90** |

> Actions with a final score ≥ `risk_threshold` (default: **85**) are blocked and logged. Actions below threshold are allowed and silently monitored.

<br/>

---

## ◈ Project Structure

```
compliance-dlp/
│
├── api/
│   └── extension.php          ← PHP REST API: policy + event ingestion
│
├── extension/
│   ├── manifest.json          ← Chrome MV3 manifest
│   ├── content.js             ← Core DLP engine (injected into all pages)
│   ├── background.js          ← Service worker
│   ├── popup.html             ← Toolbar popup UI
│   ├── popup.js               ← Popup logic (email save/load)
│   ├── styles.css             ← Popup styles
│   └── icon128.png            ← Extension icon
│
├── logs/
│   ├── dlp_events.log         ← All blocked events (JSONL)
│   └── pci_violations.log     ← PCI-specific violations (JSONL)
│
├── .gitignore                 ← Excludes logs and secrets
├── LICENSE
└── README.md
```

<br/>

---

## ◈ Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Extension runtime** | JavaScript · Chrome MV3 APIs | Event interception, DOM inspection, policy enforcement |
| **Backend API** | PHP 7.4+ (no frameworks) | Policy serving, event ingestion, stats aggregation |
| **Pattern detection** | PCRE regex | PCI · SSN · CNIC · phone number matching |
| **Logging** | JSONL | Audit trail, forensic metadata, SIEM-ingestible format |
| **API authentication** | `X-API-Key` header | Request validation, CORS hardening |

<br/>

---

## ◈ Security Hardening

| Control | Action |
|---------|--------|
| **API key** | Replace the default key with a cryptographically random string before deployment |
| **HTTPS only** | Serve `extension.php` exclusively over TLS — never plain HTTP |
| **Log file permissions** | Set `chmod 600` on log files in production; logs contain PII |
| **`.env` / secrets** | Never commit API keys or secrets — add `*.log` and `.env` to `.gitignore` |
| **Key rotation** | Rotate `API_SECRET_KEY` on a defined schedule; update `content.js` simultaneously |
| **Server hardening** | Restrict `extension.php` to POST/GET only; block all other methods at Nginx/Apache |

<br/>

---

## ◈ Roadmap

Planned enhancements — contributions welcome:

- [ ] **Firefox support** — port to WebExtensions API
- [ ] **MySQL backend** — replace file-based logging for production scale
- [ ] **Admin dashboard** — React/Vue UI for log visualization and policy management
- [ ] **Email alerting** — notify security team on high-risk violations in real time
- [ ] **GDPR / HIPAA patterns** — extend PCI_PATTERNS with EU and healthcare regulatories
- [ ] **ML-based risk scoring** — replace static weights with a trained classifier

<br/>

---

## ◈ Contributing

```bash
# 1. Fork → clone → branch
git checkout -b feature/firefox-port

# 2. Make changes, test in Chrome first
# chrome://extensions/ → Reload unpacked

# 3. Commit with a clear message
git commit -m "feat: add Firefox WebExtensions manifest"

# 4. Push and open a Pull Request
git push origin feature/firefox-port
```

<br/>

---

## ◈ License

Distributed under the **MIT License** — see [`LICENSE`](LICENSE) for full terms.

<br/>

---


<br/>

---

<div align="center">

Built with `JavaScript` · `Chrome MV3` · `PHP` · `JSONL`

<br/>

*Protect your data before it leaves. Leave a ⭐ if Compliance DLP helped secure your org.*

</div>
