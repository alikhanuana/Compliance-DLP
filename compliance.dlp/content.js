// ============================================================
// Compliance DLP - Content Script v2.0
// COMPLETE - Blocks all upload methods with PCI detection
// ============================================================

(function() {
  'use strict';
  
  if (window.__dlpInjected) return;
  window.__dlpInjected = true;
  
  console.log('[DLP-CS] Content script active on:', location.hostname);
  
  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  const MAX_UPLOAD_MB = 5;
  const BLOCKED_DOMAINS = ['wetransfer.com', 'mega.nz', 'filebin.net', 'anonfiles.com', 'mediafire.com', 'dropbox.com'];
  
  // PCI DSS Patterns
  const PCI_PATTERNS = {
    CREDIT_CARD: { regex: /\b(?:\d[ -]?){13,16}\b/, label: 'Credit Card Number' },
    SSN: { regex: /\b\d{3}-\d{2}-\d{4}\b/, label: 'SSN (XXX-XX-XXXX)' },
    PK_PHONE: { regex: /(?:\+92|0)3[0-9]{9}\b/, label: 'Pakistani Phone Number' },
    CNIC: { regex: /\b\d{5}-\d{7}-\d{1}\b/, label: 'Pakistani CNIC' }
  };
  
  // Text file extensions for content scanning
  const TEXT_EXTENSIONS = ['txt', 'csv', 'json', 'xml', 'log', 'sql', 'html', 'htm', 'md', 'js', 'ts', 'py', 'rb', 'sh', 'yaml', 'yml', 'ini', 'cfg', 'conf'];
  
  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  function detectSensitiveData(text) {
    if (typeof text !== 'string' || !text.trim()) return [];
    const found = [];
    for (const [key, pattern] of Object.entries(PCI_PATTERNS)) {
      if (pattern.regex.test(text)) {
        found.push(pattern.label);
      }
    }
    return found;
  }
  
  function isTextFile(filename, mimeType) {
    if (mimeType && (mimeType.startsWith('text/') || 
        mimeType === 'application/json' || 
        mimeType === 'application/xml')) {
      return true;
    }
    const ext = filename.split('.').pop().toLowerCase();
    return TEXT_EXTENSIONS.includes(ext);
  }
  
  function isBlockedDomain(url) {
    try {
      const host = new URL(url, location.href).hostname;
      return BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
    } catch {
      return false;
    }
  }
  
  async function scanFileForPCI(file) {
    if (!isTextFile(file.name, file.type)) return [];
    
    return new Promise((resolve) => {
      const slice = file.slice(0, 200 * 1024); // Read first 200KB
      const reader = new FileReader();
      reader.onload = (e) => resolve(detectSensitiveData(e.target.result || ''));
      reader.onerror = () => resolve([]);
      reader.readAsText(slice);
    });
  }
  
  function reportBlock(data) {
    try {
      chrome.runtime.sendMessage({
        type: 'BLOCK_EVENT',
        data: {
          filename: data.filename || 'unknown',
          fileSizeMB: data.fileSizeMB || 0,
          destination: data.destination || location.hostname,
          reason: data.reason || 'Policy violation',
          sensitiveDataTypes: data.sensitiveDataTypes || [],
          violationType: data.violationType || 'upload'
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[DLP-CS] Send message error:', chrome.runtime.lastError.message);
        }
      });
    } catch (err) {
      console.warn('[DLP-CS] Report block error:', err.message);
    }
  }
  
  // ============================================================
  // WARNING OVERLAY
  // ============================================================
  
  function showWarning({ filename, sizeMB, reason, sensitiveTypes = [] }) {
    const existing = document.getElementById('__dlp_overlay__');
    if (existing) existing.remove();
    
    const isPCI = sensitiveTypes && sensitiveTypes.length > 0;
    const color = isPCI ? '#dc2626' : '#ea580c';
    const title = isPCI ? '🔴 PCI DSS VIOLATION' : '🟠 UPLOAD BLOCKED';
    
    const overlay = document.createElement('div');
    overlay.id = '__dlp_overlay__';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      width: 380px;
      background: white;
      border: 2px solid ${color};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
      <style>
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
      </style>
      <div style="background: ${color}; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="color: white; font-weight: bold; font-size: 12px;">COMPLIANCE DLP</div>
          <div style="color: rgba(255,255,255,0.85); font-size: 10px;">${title}</div>
        </div>
        <button id="dlp_close_btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px;">×</button>
      </div>
      <div style="padding: 16px;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
          <div style="font-size: 10px; color: #6b7280;">BLOCKED FILE</div>
          <div style="font-weight: bold; word-break: break-all;">📄 ${escapeHtml(filename)}</div>
          ${sizeMB > 0 ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Size: ${sizeMB.toFixed(2)} MB</div>` : ''}
        </div>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px;">
          <div style="font-size: 10px; color: #6b7280;">REASON</div>
          <div style="font-size: 12px; color: #9a3412; font-weight: 500;">${escapeHtml(reason)}</div>
        </div>
        ${isPCI ? `
        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-top: 10px;">
          <div style="font-size: 10px; color: #92400e;">⚠️ PCI DSS DATA DETECTED</div>
          ${sensitiveTypes.map(t => `<div style="font-size: 11px; color: #b45309;">• ${escapeHtml(t)}</div>`).join('')}
        </div>
        ` : ''}
        <div style="margin-top: 12px; text-align: right; font-size: 10px; color: #9ca3af;">
          ✓ Event logged to security dashboard
        </div>
      </div>
      <div style="height: 3px; background: #f3f4f6;">
        <div id="dlp_progress" style="height: 100%; width: 100%; background: ${color}; transition: width 8s linear;"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('dlp_close_btn')?.addEventListener('click', () => overlay.remove());
    
    setTimeout(() => {
      const progress = document.getElementById('dlp_progress');
      if (progress) progress.style.width = '0%';
    }, 10);
    
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => overlay.remove(), 300);
      }
    }, 8000);
  }
  
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }
  
  // ============================================================
  // FILE INPUT BLOCKING
  // ============================================================
  
  async function checkAndBlockFile(file, source = 'input') {
    const sizeMB = file.size / (1024 * 1024);
    const violations = [];
    let pciTypes = [];
    
    if (sizeMB > MAX_UPLOAD_MB) {
      violations.push(`File size ${sizeMB.toFixed(2)} MB exceeds ${MAX_UPLOAD_MB} MB limit`);
    }
    
    if (isBlockedDomain(location.href)) {
      violations.push(`Destination domain is blacklisted`);
    }
    
    pciTypes = await scanFileForPCI(file);
    if (pciTypes.length > 0) {
      violations.push(`PCI DSS sensitive data detected: ${pciTypes.join(', ')}`);
    }
    
    if (violations.length > 0) {
      console.log('[DLP-CS] Blocking file:', file.name, violations);
      
      showWarning({
        filename: file.name,
        sizeMB: sizeMB,
        reason: violations[0],
        sensitiveTypes: pciTypes
      });
      
      reportBlock({
        filename: file.name,
        fileSizeMB: sizeMB,
        destination: location.hostname,
        reason: violations[0],
        sensitiveDataTypes: pciTypes,
        violationType: 'upload'
      });
      
      return { blocked: true, reason: violations[0] };
    }
    
    return { blocked: false };
  }
  
  function watchFileInputs() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
      if (input.__dlpWatched) return;
      input.__dlpWatched = true;
      
      input.addEventListener('change', async function(e) {
        const files = Array.from(this.files || []);
        if (files.length === 0) return;
        
        for (const file of files) {
          const result = await checkAndBlockFile(file, 'input');
          if (result.blocked) {
            this.value = '';
            break;
          }
        }
      }, true);
    });
  }
  
  // ============================================================
  // DRAG AND DROP BLOCKING
  // ============================================================
  
  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('drop', async (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    for (const file of files) {
      const result = await checkAndBlockFile(file, 'dragdrop');
      if (result.blocked) break;
    }
  }, true);
  
  // ============================================================
  // COPY-PASTE BLOCKING
  // ============================================================
  
  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const result = await checkAndBlockFile(file, 'paste');
          if (result.blocked) {
            e.preventDefault();
            e.stopPropagation();
            break;
          }
        }
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        item.getAsString(async (text) => {
          const pciTypes = detectSensitiveData(text);
          if (pciTypes.length > 0) {
            e.preventDefault();
            showWarning({
              filename: 'Clipboard Text',
              sizeMB: 0,
              reason: `PCI DSS sensitive data in clipboard: ${pciTypes.join(', ')}`,
              sensitiveTypes: pciTypes
            });
            reportBlock({
              filename: 'Clipboard Text',
              fileSizeMB: 0,
              destination: location.hostname,
              reason: `PCI DSS sensitive data in clipboard: ${pciTypes.join(', ')}`,
              sensitiveDataTypes: pciTypes,
              violationType: 'upload'
            });
          }
        });
      }
    }
  }, true);
  
  // ============================================================
  // NETWORK INTERCEPTION (injected into page context)
  // ============================================================
  
  const pageScript = document.createElement('script');
  pageScript.textContent = `
    (function() {
      if (window.__dlpNetActive) return;
      window.__dlpNetActive = true;
      
      const MAX_MB = 5;
      const BLOCKED_DOMAINS = ${JSON.stringify(BLOCKED_DOMAINS)};
      
      function isBlockedDomain(url) {
        try {
          const host = new URL(url, location.href).hostname;
          return BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
        } catch { return false; }
      }
      
      function dispatchBlockEvent(detail) {
        window.dispatchEvent(new CustomEvent('__dlp_block_event__', { detail }));
      }
      
      // Fetch interception
      const originalFetch = window.fetch;
      window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : (input.url || String(input));
        const method = (init.method || 'GET').toUpperCase();
        
        if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && init.body) {
          let size = 0;
          if (init.body instanceof Blob) {
            size = init.body.size;
          } else if (typeof init.body === 'string') {
            size = init.body.length;
          }
          
          const sizeMB = size / (1024 * 1024);
          if (sizeMB > MAX_MB || isBlockedDomain(url)) {
            console.warn('[DLP-Net] Fetch blocked:', url, sizeMB.toFixed(2), 'MB');
            dispatchBlockEvent({ url: url, sizeMB: sizeMB, reason: 'File upload blocked by DLP policy' });
            return new Response(JSON.stringify({ error: 'Blocked by Compliance DLP' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        return originalFetch.apply(this, arguments);
      };
      
      // XHR interception
      const XHR = XMLHttpRequest;
      const originalSend = XHR.prototype.send;
      const originalOpen = XHR.prototype.open;
      
      XHR.prototype.open = function(method, url) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
      };
      
      XHR.prototype.send = function(body) {
        if ((this._method === 'POST' || this._method === 'PUT' || this._method === 'PATCH') && body) {
          let size = 0;
          if (body instanceof Blob) {
            size = body.size;
          } else if (typeof body === 'string') {
            size = body.length;
          }
          
          const sizeMB = size / (1024 * 1024);
          if (sizeMB > MAX_MB || isBlockedDomain(this._url)) {
            console.warn('[DLP-Net] XHR blocked:', this._url, sizeMB.toFixed(2), 'MB');
            dispatchBlockEvent({ url: this._url, sizeMB: sizeMB, reason: 'File upload blocked by DLP policy' });
            this.abort();
            return;
          }
        }
        return originalSend.call(this, body);
      };
      
      console.log('[DLP-Net] Network interceptors active');
    })();
  `;
  
  (document.head || document.documentElement).appendChild(pageScript);
  pageScript.remove();
  
  // ============================================================
  // LISTEN FOR NETWORK BLOCK EVENTS
  // ============================================================
  
  window.addEventListener('__dlp_block_event__', (e) => {
    const { url, sizeMB, reason } = e.detail;
    console.log('[DLP-CS] Network block event:', url, sizeMB, reason);
    
    let destination = location.hostname;
    try {
      destination = new URL(url).hostname;
    } catch {}
    
    showWarning({
      filename: 'Network Upload',
      sizeMB: sizeMB,
      reason: reason,
      sensitiveTypes: []
    });
    
    reportBlock({
      filename: 'network_upload',
      fileSizeMB: sizeMB,
      destination: destination,
      reason: reason,
      sensitiveDataTypes: [],
      violationType: 'upload'
    });
  });
  
  // ============================================================
  // MUTATION OBSERVER FOR DYNAMIC FILE INPUTS
  // ============================================================
  
  const observer = new MutationObserver(() => {
    watchFileInputs();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // ============================================================
  // INITIALIZE
  // ============================================================
  
  watchFileInputs();
  setInterval(watchFileInputs, 2000);
  
  console.log('[DLP-CS] All protection layers active on:', location.hostname);
  
})();
