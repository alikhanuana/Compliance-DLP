// ============================================================
// Compliance DLP - Popup Script v2.0
// FIXED: Shows saved email, prevents re-entry
// ============================================================

'use strict';

const $ = id => document.getElementById(id);

const elAvatar = $('user-avatar');
const elUsername = $('user-username');
const elEmail = $('user-email');
const elIP = $('user-ip');
const elTotal = $('stat-total');
const elToday = $('stat-today');
const elPCI = $('stat-pci');
const elLog = $('log-container');
const elSetupSection = $('setup-section');
const elConfiguredSection = $('configured-section');
const elSavedEmail = $('saved-email');
const elInpEmail = $('inp-email');
const elInpPass = $('inp-pass');
const elSave = $('btn-save');
const elTest = $('btn-test');
const elRefresh = $('btn-refresh');
const elUnPrev = $('username-preview');
const elUnTxt = $('uname-txt');
const elToast = $('toast');

// ============================================================
// TOAST NOTIFICATION
// ============================================================

function toast(msg, ms = 3200) {
  elToast.textContent = msg;
  elToast.classList.add('show');
  clearTimeout(elToast.__t);
  elToast.__t = setTimeout(() => elToast.classList.remove('show'), ms);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isToday(iso) {
  try {
    const d = new Date(iso);
    const n = new Date();
    return d.getDate() === n.getDate() && 
           d.getMonth() === n.getMonth() && 
           d.getFullYear() === n.getFullYear();
  } catch {
    return false;
  }
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
           d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function getInitials(username) {
  if (!username) return '?';
  const parts = username.replace(/[._-]/g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderProfile(username, email, ip) {
  if (username && username !== 'Not Configured') {
    elUsername.textContent = username;
  } else {
    elUsername.textContent = email ? email.split('@')[0] : 'Not Configured';
  }
  elEmail.textContent = email || 'Not configured';
  elIP.textContent = ip || 'Fetching...';
  elAvatar.textContent = getInitials(username || (email ? email.split('@')[0] : '?'));
}

function renderLog(entries) {
  if (!entries || entries.length === 0) {
    elLog.innerHTML = '<div class="log-empty">No blocked events yet.<br>Events appear here in real-time.</div>';
    return;
  }
  
  const rows = entries.slice(0, 8).map(entry => {
    const hasPCI = entry.pci_violation === 1 || (entry.sensitiveDataTypes && entry.sensitiveDataTypes.length > 0);
    const pciTag = hasPCI ? '<span class="pci-tag">PCI</span>' : '';
    const icon = entry.violation_type === 'download' ? '⬇️' : '⬆️';
    const sizeText = entry.fileSizeMB > 0 ? `${Number(entry.fileSizeMB).toFixed(2)} MB · ` : '';
    const destination = escapeHtml(entry.destination_domain || entry.destination || '');
    
    return `
      <div class="le">
        <div class="le-dot"></div>
        <div style="flex:1; min-width:0">
          <div class="le-fn">${icon} ${escapeHtml(entry.filename || 'unknown')} ${pciTag}</div>
          <div class="le-meta">${sizeText}${destination} · Risk: ${entry.riskScore || entry.risk_score || '—'}/100</div>
          <div class="le-reason">${escapeHtml(entry.reason || entry.block_reason || 'Policy violation')}</div>
          <div style="font-size:9.5px;color:#9ca3af;margin-top:2px">${formatTime(entry.timestamp || entry.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
  
  const extra = entries.length > 8 
    ? `<div style="text-align:center;padding:5px 0;font-size:10.5px;color:var(--muted)">+${entries.length - 8} more events</div>`
    : '';
  
  elLog.innerHTML = rows + extra;
}

// ============================================================
// LOAD STATUS FROM BACKGROUND
// ============================================================

async function loadStatus() {
  try {
    const data = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    
    if (!data) return;
    
    const email = data.email;
    const username = data.username || (email ? email.split('@')[0] : null);
    
    // Show/hide appropriate sections
    if (data.setupComplete && email) {
      // User is configured - show configured section
      elSetupSection.style.display = 'none';
      elConfiguredSection.style.display = 'block';
      elSavedEmail.textContent = email;
      renderProfile(username, email, data.ip);
    } else {
      // User not configured - show setup section
      elSetupSection.style.display = 'block';
      elConfiguredSection.style.display = 'none';
      renderProfile(null, null, data.ip);
    }
    
    const logs = data.blockedFilesLog || [];
    const todayCount = logs.filter(log => isToday(log.timestamp || log.created_at)).length;
    const pciCount = logs.filter(log => log.pci_violation === 1 || (log.sensitiveDataTypes?.length > 0)).length;
    
    elTotal.textContent = data.totalBlocked || 0;
    elToday.textContent = todayCount;
    elPCI.textContent = pciCount;
    
    renderLog(logs);
    
    console.log('[DLP-Popup] Status loaded - Setup complete:', data.setupComplete, 'Email:', email);
    
  } catch (err) {
    console.error('[DLP-Popup] Load status error:', err);
    toast('⚠️ Failed to load status: ' + err.message);
  }
}

// ============================================================
// EMAIL INPUT PREVIEW
// ============================================================

if (elInpEmail) {
  elInpEmail.addEventListener('input', function() {
    const val = this.value.trim();
    const username = val.includes('@') ? val.split('@')[0] : val;
    
    if (username) {
      elUnPrev.style.display = 'block';
      elUnTxt.textContent = username;
    } else {
      elUnPrev.style.display = 'none';
    }
  });
  
  // Trigger preview on initial load
  if (elInpEmail.value) {
    elInpEmail.dispatchEvent(new Event('input'));
  }
}

// ============================================================
// SAVE ACCOUNT
// ============================================================

if (elSave) {
  elSave.addEventListener('click', async () => {
    const email = elInpEmail.value.trim();
    const password = elInpPass.value.trim();
    
    if (!email || !password) {
      toast('⚠️ Both email and password are required');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('⚠️ Please enter a valid email address');
      return;
    }
    
    elSave.disabled = true;
    elSave.textContent = '⏳ Saving...';
    
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          type: 'SAVE_EMAIL', 
          data: { email, password } 
        }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response?.success) {
        const username = email.split('@')[0];
        toast(`✅ Account saved! Welcome ${username}`);
        await loadStatus();
      } else {
        toast('❌ Save failed: ' + (response?.error || 'Unknown error'));
      }
    } catch (err) {
      toast('❌ Error: ' + err.message);
    } finally {
      elSave.disabled = false;
      elSave.textContent = '💾 Save & Activate Account';
    }
  });
}

// ============================================================
// TEST SERVER CONNECTION
// ============================================================

if (elTest) {
  elTest.addEventListener('click', async () => {
    elTest.disabled = true;
    elTest.textContent = '⏳ Testing...';
    
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'TEST_SERVER' }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response?.success) {
        toast(`✅ Server connected!`);
      } else {
        toast(`⚠️ Server unreachable: ${response?.error || 'Check server URL'}`);
      }
    } catch (err) {
      toast('❌ Test failed: ' + err.message);
    } finally {
      elTest.disabled = false;
      elTest.textContent = '🔌 Test Server';
    }
  });
}

// ============================================================
// REFRESH STATUS
// ============================================================

if (elRefresh) {
  elRefresh.addEventListener('click', async () => {
    elRefresh.disabled = true;
    elRefresh.textContent = '⏳ Refreshing...';
    
    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'REFRESH_IP' }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      await loadStatus();
      toast('✅ Status refreshed');
    } catch (err) {
      toast('❌ Refresh failed: ' + err.message);
    } finally {
      elRefresh.disabled = false;
      elRefresh.textContent = '🔄 Refresh';
    }
  });
}

// ============================================================
// INITIALIZE
// ============================================================

loadStatus();
setInterval(loadStatus, 10000);

console.log('[DLP-Popup] Loaded - Compliance DLP v2.0');
