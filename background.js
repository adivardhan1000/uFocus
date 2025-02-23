// background.js

// Variables to track current active tab info
let activeTabId = null;
let activeStartTime = null;
let activeDomain = null;

// Helper: Extract main domain (treat subdomains as main domain)
function getBaseDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    // If hostname starts with "www.", remove it
    const noWWW = hostname.replace(/^www\./, '');
    const parts = noWWW.split('.');
    if (parts.length >= 2) {
      // Simply take the last two segments
      return parts.slice(-2).join('.');
    }
    return noWWW;
  } catch (err) {
    return null;
  }
}

// Save session record to storage
function addRecord(record) {
  browser.storage.local.get({ sessions: [] }).then(result => {
    const sessions = result.sessions;
    sessions.push(record);
    browser.storage.local.set({ sessions });
  });
}

// Stop the current tracking session and record time
function stopTracking() {
  if (activeTabId && activeStartTime && activeDomain) {
    const now = Date.now();
    // Only record if at least one second has passed
    if (now - activeStartTime > 1000) {
      const record = {
        domain: activeDomain,
        start: activeStartTime,
        end: now
      };
      addRecord(record);
    }
  }
  activeTabId = null;
  activeDomain = null;
  activeStartTime = null;
}

// Start tracking for a given tab
function startTracking(tabId, url) {
  // Only track http(s) URLs
  if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) return;
  activeTabId = tabId;
  activeDomain = getBaseDomain(url);
  activeStartTime = Date.now();
}

// When the active tab changes
function handleTabActivated(activeInfo) {
  stopTracking();
  browser.tabs.get(activeInfo.tabId).then(tab => {
    startTracking(tab.id, tab.url);
  });
}

// When window focus changes (if no window is focused, stop tracking)
function handleWindowFocusChanged(windowId) {
  // WINDOW_ID_NONE means no window is focused
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    // Get the active tab in the focused window
    browser.tabs.query({ active: true, windowId: windowId }).then(tabs => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        stopTracking();
        startTracking(tab.id, tab.url);
      }
    });
  }
}

// If the URL of the active tab changes, update the tracking session
function handleTabUpdated(tabId, changeInfo, tab) {
  if (tabId === activeTabId && changeInfo.url) {
    stopTracking();
    startTracking(tab.id, tab.url);
  }
}

// Listen for events
browser.tabs.onActivated.addListener(handleTabActivated);
browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);
browser.tabs.onUpdated.addListener(handleTabUpdated, { properties: ["url"] });

// Also, listen for idle state changes if needed
// (You can optionally use browser.idle.onStateChanged to stop tracking if the user is idle)
browser.idle.onStateChanged.addListener(state => {
  if (state !== "active") {
    stopTracking();
  } else {
    // When returning from idle, get the current active tab of the current window
    browser.windows.getLastFocused({ populate: true }).then(win => {
      if (win && win.focused) {
        const activeTab = win.tabs.find(t => t.active);
        if (activeTab) {
          startTracking(activeTab.id, activeTab.url);
        }
      }
    });
  }
});
