// ============================================================
// Compliance DLP - Background Service Worker v2.0
// COMPLETE FIXED VERSION - Proper server communication
// ============================================================

'use strict';

const CONFIG = {
  SERVER_URL: 'http://172.24.1.135/api/extension.php',
  IP_API: 'https://api.ipify.org?format=json',
  DEFAULT_EMAIL: '',
  DEFAULT_PASSWORD: '',
  MAX_UPLOAD_SIZE_MB: 5,
  MAX_DOWNLOAD_SIZE_MB: 10,
  MAX_LOG_ENTRIES: 100,
  KEEP_ALIVE_INTERVAL_MINUTES: 0.5,
  BLOCKED_DOMAINS: ['wetransfer.com', 'mega.nz', 'filebin.net', 'anonfiles.com', 'mediafire.com', 'dropbox.com'],
  DANGEROUS_EXTENSIONS: ['.exe', '.ps1', '.bat', '.vbs', '.scr', '.jar', '.msi', '.dmg', '.pkg', '.sh', '.py', '.rb']
};

let cachedIP = null;
let ipFetchTime = null;

// ============================================================
// INITIALIZATION
// ============================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[DLP-BG] Extension installed/updated:', details.reason);
  await initializeStorage();
  await fetchAndCacheIP();
  await sendHeartbeat();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[DLP-BG] Browser started');
  await fetchAndCacheIP();
  await sendHeartbeat();
});

// Keep-alive alarm
chrome.alarms.create('keepAlive', { periodInMinutes: CONFIG.KEEP_ALIVE_INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('[DLP-BG] Keep-alive heartbeat');
    await sendHeartbeat();
  }
});

// ============================================================
// STORAGE INITIALIZATION
// ============================================================

async function initializeStorage() {
  try {
    const stored = await chrome.storage.local.get([
      'email', 'password', 'username', 'blockedFilesLog', 
      'totalBlocked', 'setupComplete', 'cachedIP'
    ]);
    
    const updates = {};
    
    if (!stored.blockedFilesLog) updates.blockedFilesLog = [];
    if (typeof stored.totalBlocked !== 'number') updates.totalBlocked = 0;
    if (typeof stored.setupComplete !== 'boolean') updates.setupComplete = false;
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
      console.log('[DLP-BG] Storage initialized');
    }
    
    if (stored.email) {
      console.log('[DLP-BG] User already configured:', stored.email);
    } else {
      console.log('[DLP-BG] No user configured, waiting for setup');
    }
  } catch (err) {
    console.error('[DLP-BG] Storage init error:', err);
  }
}

// ============================================================
// IP ADDRESS MANAGEMENT
// ============================================================

async function fetchAndCacheIP() {
  try {
    const response = await fetch(CONFIG.IP_API, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    cachedIP = data.ip;
    ipFetchTime = Date.now();
    await chrome.storage.local.set({ cachedIP: cachedIP, ipFetchedAt: ipFetchTime });
    console.log('[DLP-BG] IP cached:', cachedIP);
    return cachedIP;
  } catch (err) {
    console.warn('[DLP-BG] IP fetch failed:', err.message);
    const stored = await chrome.storage.local.get('cachedIP');
    cachedIP = stored.cachedIP || '0.0.0.0';
    return cachedIP;
  }
}

async function getCurrentIP() {
  if (cachedIP && ipFetchTime && (Date.now() - ipFetchTime) < 600000) {
    return cachedIP;
  }
  return await fetchAndCacheIP();
}

// ============================================================
// SERVER COMMUNICATION
// ============================================================

async function sendToServer(payload) {
  const maxRetries = 2;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DLP-BG] Sending to server (attempt ${attempt}):`, JSON.stringify(payload, null, 2));
      
      const response = await fetch(CONFIG.SERVER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch(e) {
        responseData = { raw: responseText };
      }
      
      console.log(`[DLP-BG] Server response (${response.status}):`, responseData);
      
      if (response.ok) {
        return { success: true, status: response.status, data: responseData };
      } else {
        lastError = `HTTP ${response.status}: ${responseText}`;
      }
    } catch (err) {
      lastError = err.message;
      console.warn(`[DLP-BG] Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  
  console.error('[DLP-BG] All server attempts failed:', lastError);
  return { success: false, error: lastError };
}

async function sendHeartbeat() {
  try {
    const stored = await chrome.storage.local.get(['email', 'username']);
    if (!stored.email) return;
    
    const email = stored.email;
    const username = stored.username || email.split('@')[0];
    const ip = await getCurrentIP();
    
    const payload = {
      action: 'heartbeat',
      event_type: 'heartbeat',
      username: username,
      user_name: username,
      email: email,
      user_email: email,
      ip_address: ip,
      ipAddress: ip,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      message: 'Compliance DLP — Extension Active',
      extension_version: '2.0.0',
      browser: 'Chrome'
    };
    
    await sendToServer(payload);
  } catch (err) {
    console.warn('[DLP-BG] Heartbeat failed:', err.message);
  }
}

// ============================================================
// BLOCK EVENT HANDLER
// ============================================================

async function handleBlockEvent(data) {
  try {
    const stored = await chrome.storage.local.get([
      'email', 'username', 'blockedFilesLog', 'totalBlocked'
    ]);
    
    if (!stored.email) {
      console.log('[DLP-BG] No user configured, skipping block log');
      return { success: false, error: 'No user configured' };
    }
    
    const email = stored.email;
    const username = stored.username || email.split('@')[0];
    const ip = await getCurrentIP();
    
    const log = stored.blockedFilesLog || [];
    const total = (stored.totalBlocked || 0) + 1;
    
    const hasPCI = data.sensitiveDataTypes && data.sensitiveDataTypes.length > 0;
    const riskScore = hasPCI ? 92 + Math.floor(Math.random() * 4) : 85 + Math.floor(Math.random() * 6);
    const fileSizeMB = parseFloat((data.fileSizeMB || 0).toFixed(4));
    const now = new Date().toISOString();
    const eventId = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    
    const entry = {
      id: eventId,
      event_type: data.violationType === 'download' ? 'download_blocked' : 'upload_blocked',
      
      username: username,
      user_name: username,
      email: email,
      user_email: email,
      ip_address: ip,
      ipAddress: ip,
      
      filename: data.filename || 'unknown',
      file_name: data.filename || 'unknown',
      fileSizeMB: fileSizeMB,
      file_size_mb: fileSizeMB,
      fileSizeBytes: Math.round(fileSizeMB * 1024 * 1024),
      file_size_bytes: Math.round(fileSizeMB * 1024 * 1024),
      
      destination: data.destination || 'unknown',
      destination_domain: data.destination || 'unknown',
      blocked: true,
      is_blocked: 1,
      reason: data.reason || 'Policy violation',
      block_reason: data.reason || 'Policy violation',
      violationType: data.violationType || 'upload',
      violation_type: data.violationType || 'upload',
      
      riskScore: riskScore,
      risk_score: riskScore,
      sensitiveDataTypes: data.sensitiveDataTypes || [],
      sensitive_data_types: (data.sensitiveDataTypes || []).join(', '),
      pci_violation: hasPCI ? 1 : 0,
      pci_types_detected: data.sensitiveDataTypes || [],
      
      timestamp: now,
      created_at: now,
      
      extension_version: '2.0.0',
      browser: 'Chrome'
    };
    
    console.log('[DLP-BG] Block entry created:', JSON.stringify(entry, null, 2));
    
    log.unshift(entry);
    if (log.length > CONFIG.MAX_LOG_ENTRIES) log.pop();
    await chrome.storage.local.set({ blockedFilesLog: log, totalBlocked: total });
    
    showBlockNotification(entry);
    
    const serverResult = await sendToServer(entry);
    
    if (!serverResult.success) {
      console.warn('[DLP-BG] Server log failed, stored locally only');
    }
    
    return { success: true, entry: entry, serverResult: serverResult };
    
  } catch (err) {
    console.error('[DLP-BG] handleBlockEvent ERROR:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// NOTIFICATION
// ============================================================

function showBlockNotification(entry) {
  const isPCI = entry.pci_violation === 1;
  const isDownload = entry.violation_type === 'download';
  
  const title = isDownload ? '⛔ Download Blocked'
              : isPCI ? '🔴 PCI DSS Violation'
              : '⛔ Upload Blocked';
  
  const message = `File: ${entry.filename}\nSize: ${entry.fileSizeMB} MB\nReason: ${entry.reason}\nRisk: ${entry.riskScore}/100`;
  
  chrome.notifications.create(`dlp_${entry.id}`, {
    type: 'basic',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23dc2626"%3E%3Cpath d="M12 2L2 7v10l10 5 10-5V7l-10-5zM12 4.2l7.5 3.8-7.5 3.8-7.5-3.8 7.5-3.8zM3 8.5l8 4v8l-8-4v-8zm10 12v-8l8-4v8l-8 4z"/%3E%3C/svg%3E',
    title: `🛡️ Compliance DLP - ${title}`,
    message: message.substring(0, 200),
    priority: 2,
    requireInteraction: isPCI
  });
}

// ============================================================
// DOWNLOAD BLOCKING
// ============================================================

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const sizeMB = downloadItem.fileSize > 0 ? downloadItem.fileSize / (1024 * 1024) : 0;
  const filename = decodeURIComponent(downloadItem.filename.split('/').pop().split('?')[0] || 'unknown');
  const ext = filename.includes('.') ? ('.' + filename.split('.').pop()).toLowerCase() : '';
  
  const isDangerous = CONFIG.DANGEROUS_EXTENSIONS.includes(ext);
  const isTooLarge = sizeMB > CONFIG.MAX_DOWNLOAD_SIZE_MB;
  
  if (!isDangerous && !isTooLarge) return;
  
  try {
    await chrome.downloads.cancel(downloadItem.id);
    console.log('[DLP-BG] Download cancelled:', filename);
  } catch(e) {
    console.warn('[DLP-BG] Could not cancel download:', e);
  }
  
  let destination = 'unknown';
  try {
    destination = new URL(downloadItem.url).hostname;
  } catch(e) {}
  
  await handleBlockEvent({
    filename: filename,
    fileSizeMB: sizeMB,
    destination: destination,
    reason: isDangerous ? `Dangerous file extension blocked: ${ext}` : `Download ${sizeMB.toFixed(2)} MB exceeds 10 MB limit`,
    sensitiveDataTypes: isDangerous ? [`Dangerous Extension: ${ext}`] : [],
    violationType: 'download'
  });
});

// ============================================================
// MESSAGE HANDLER
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DLP-BG] Message received:', message.type);
  
  if (message.type === 'BLOCK_EVENT') {
    handleBlockEvent(message.data).then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['email', 'username', 'cachedIP', 'blockedFilesLog', 'totalBlocked', 'setupComplete'])
      .then(data => {
        sendResponse({
          email: data.email || null,
          username: data.username || null,
          ip: data.cachedIP || 'Fetching...',
          blockedFilesLog: data.blockedFilesLog || [],
          totalBlocked: data.totalBlocked || 0,
          setupComplete: data.setupComplete || false
        });
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'SAVE_EMAIL') {
    const { email, password } = message.data;
    const username = email.split('@')[0];
    
    chrome.storage.local.set({
      email: email,
      password: password,
      username: username,
      setupComplete: true
    }).then(async () => {
      console.log('[DLP-BG] Account saved - Username:', username, 'Email:', email);
      await sendHeartbeat();
      sendResponse({ success: true, username: username });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  
  if (message.type === 'TEST_SERVER') {
    (async () => {
      const stored = await chrome.storage.local.get(['email', 'username']);
      if (!stored.email) {
        sendResponse({ success: false, error: 'No user configured. Please save email first.' });
        return;
      }
      
      const email = stored.email;
      const username = stored.username || email.split('@')[0];
      const ip = await getCurrentIP();
      
      const result = await sendToServer({
        action: 'test',
        event_type: 'connection_test',
        username: username,
        user_name: username,
        email: email,
        user_email: email,
        ip_address: ip,
        ipAddress: ip,
        timestamp: new Date().toISOString(),
        message: 'Compliance DLP — Connection Test'
      });
      
      sendResponse(result);
    })();
    return true;
  }
  
  if (message.type === 'REFRESH_IP') {
    fetchAndCacheIP().then(ip => sendResponse({ ip: ip }));
    return true;
  }
  
  sendResponse({ received: true });
  return false;
});

console.log('[DLP-BG] Service worker loaded - Compliance DLP v2.0');
