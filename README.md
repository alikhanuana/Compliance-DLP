🛡️ Compliance DLP – Browser-Native Data Loss Prevention

Compliance DLP is a browser-native Data Loss Prevention (DLP) solution that prevents sensitive data from leaving an organization through copy-paste, drag-drop, file uploads, downloads, and WhatsApp Web — without proxies or network agents.

📌 Features
📋 Clipboard monitoring (copy/paste inspection)
🖱️ Drag & drop blocking
📁 File upload control (>5MB blocked)
⬇️ File download control (>10MB blocked)
💬 WhatsApp Web protection
🎯 Risk scoring engine (0–100)
🔒 PCI DSS compliance support
🧾 CNIC, SSN, credit card detection
🧠 Regex-based content scanning
📝 Full event logging system
🔌 REST API integration
🚫 Dangerous file extension blocking
⚙️ How It Works

User action → Capture → Pattern detection → Risk scoring → Decision

Risk ≥ 85 → BLOCK + LOG
Risk < 85 → ALLOW + MONITOR

Captured events:

Clipboard events
Drag/drop events
File uploads
File downloads
DOM-based inputs (WhatsApp Web etc.)
🏗️ Architecture
Chrome Extension (content.js)
Background Service Worker (background.js)
PHP Backend API (extension.php)
Log Storage (JSON files)
📋 Prerequisites
PHP 7.4+
Apache / Nginx server
Chrome or Edge browser
Extension developer mode enabled
🚀 Installation
1. Backend API Setup

Upload:

api/extension.php

Set API key:

$API_SECRET_KEY = "your-secret-key";
2. Chrome Extension Setup

Folder structure:

compliance-dlp/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── icons/
3. Load Extension
Open Chrome
Go to:
chrome://extensions/
Enable Developer Mode
Click “Load unpacked”
Select extension folder
🔌 API Endpoints
Endpoint	Method	Description
get_policy	GET	Fetch DLP rules
log_event	POST	Store violation logs
validate_license	POST	Validate user
get_stats	GET	System statistics
🧾 Logging

Example log entry:

{
  "timestamp": "2026-05-05",
  "user_email": "user@company.com",
  "action": "clipboard_paste",
  "source": "web.whatsapp.com",
  "risk_score": 95,
  "reason": "PCI data detected"
}
📁 Folder Structure
compliance-dlp/
├── api/
│   └── extension.php
├── compliance.dlp/
│   ├── background.js
│   ├── content.js
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── icons/
├── data/
│   ├── dlp_users.json
│   ├── dlp_data.json
├── index.html
└── README.md
🛡️ Security Features
PCI DSS pattern detection
CNIC validation (Pakistan)
SSN detection
Credit card detection
File type blocking
Domain blacklisting
Risk scoring engine
API key authentication
🧠 Technologies Used
JavaScript (Chrome Extension MV3)
PHP 7.4+
Regex pattern engine
JSON logging system
Fetch API
📌 Use Cases
Banking & Finance (PCI compliance)
Healthcare data protection
Contact centers
Remote workforce monitoring
Enterprise data security
🗺️ Roadmap
MySQL logging support
Admin dashboard (React)
AI-based anomaly detection
Email alerts
SIEM integration
Firefox extension support
📄 License

MIT License

⭐ Summary

Compliance DLP prevents sensitive data leaks by monitoring and blocking:

Clipboard leaks
File uploads
File downloads
Drag & drop actions
Web app data exposure
