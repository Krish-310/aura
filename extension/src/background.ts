chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub Hover AI installed')
})

chrome.storage.local.get(['serverUrl'], (res) => {
  if (!res.serverUrl) {
    chrome.storage.local.set({ serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:8787' })
  }
})
