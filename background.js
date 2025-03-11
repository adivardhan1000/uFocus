// background.js

// Variables to track current active tab info
let activeTabId = null;
let activeStartTime = null;
let activeDomain = null;
let activeContainer = null;

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

function stopTracking() {
  if (activeTabId && activeStartTime && activeDomain) {
    const now = Date.now();
    if (now - activeStartTime > 1000) {
      const record = {
        domain: activeDomain,
        start: activeStartTime,
        end: now,
        container: activeContainer
      };
      addRecord(record);
    }
  }
  activeTabId = null;
  activeDomain = null;
  activeStartTime = null;
  activeContainer = null;
}

function startTracking(tabId, url, container) {
  if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) return;
  activeTabId = tabId;
  activeDomain = getBaseDomain(url);
  activeStartTime = Date.now();
  activeContainer = container;
}

function handleTabActivated(activeInfo) {
  stopTracking();
  browser.tabs.get(activeInfo.tabId).then(tab => {
    const container = getContainerTabInfo(tab);
    startTracking(tab.id, tab.url, container);
  });
}

function handleWindowFocusChanged(windowId) {
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    browser.tabs.query({ active: true, windowId: windowId }).then(tabs => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        const container = getContainerTabInfo(tab);
        stopTracking();
        startTracking(tab.id, tab.url, container);
      }
    });
  }
}

// If the URL of the active tab changes, update the tracking session
function handleTabUpdated(tabId, changeInfo, tab) {
  if (tabId === activeTabId && changeInfo.url) {
    const container = getContainerTabInfo(tab);
    stopTracking();
    startTracking(tab.id, tab.url, container);
  }
}

function getContainerTabInfo(tab) {
  return tab.cookieStoreId || null;
}

browser.tabs.onActivated.addListener(handleTabActivated);
browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);
browser.tabs.onUpdated.addListener(handleTabUpdated, { properties: ["url"] });

browser.idle.onStateChanged.addListener(state => {
  if (state !== "active") {
    stopTracking();
  } else {
    browser.windows.getLastFocused({ populate: true }).then(win => {
      if (win && win.focused) {
        const activeTab = win.tabs.find(t => t.active);
        if (activeTab) {
          const container = getContainerTabInfo(activeTab);
          startTracking(activeTab.id, activeTab.url, container);
        }
      }
    });
  }
});
