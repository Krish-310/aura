// Popup script for Aura extension

interface RepoInfo {
  owner: string;
  repo: string;
  url: string;
}

let currentRepoInfo: RepoInfo | null = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkCurrentTab();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  const storage = await new Promise<any>((resolve) => {
    (chrome.storage as any).local.get(['serverUrl'], resolve);
  });
  const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
  serverUrlInput.value = storage.serverUrl || 'http://localhost:8787';
}

// Check current tab for GitHub repo
async function checkCurrentTab() {
  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      (chrome.tabs as any).query({ active: true, currentWindow: true }, resolve);
    });
    const tab = tabs[0];
    if (tab?.url && tab.url.includes('github.com')) {
      const repoInfo = extractRepoInfo(tab.url);
      if (repoInfo) {
        currentRepoInfo = repoInfo;
        updateRepoDisplay(repoInfo);
        enableCloneButton();
      }
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
  }
}

// Extract repository info from GitHub URL
function extractRepoInfo(url: string): RepoInfo | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      url: `https://github.com/${match[1]}/${match[2]}`
    };
  }
  return null;
}

// Update repository display
function updateRepoDisplay(repoInfo: RepoInfo) {
  const repoInfoElement = document.getElementById('repo-info');
  if (repoInfoElement) {
    repoInfoElement.textContent = `${repoInfo.owner}/${repoInfo.repo}`;
  }
}

// Enable clone button
function enableCloneButton() {
  const cloneButton = document.getElementById('clone-button') as HTMLButtonElement;
  cloneButton.disabled = false;
}

// Setup event listeners
function setupEventListeners() {
  // Clone button
  const cloneButton = document.getElementById('clone-button');
  cloneButton?.addEventListener('click', handleCloneRepositoryClick);

  // Save settings button
  const saveButton = document.getElementById('save-settings');
  saveButton?.addEventListener('click', handleSaveSettings);
}

// Handle repository cloning
async function handleCloneRepositoryClick() {
  if (!currentRepoInfo) return;

  const cloneButton = document.getElementById('clone-button') as HTMLButtonElement;
  const statusElement = document.getElementById('clone-status') as HTMLDivElement;

  try {
    cloneButton.disabled = true;
    showStatus('Initiating clone...', 'info');

    // Send message to background script to handle cloning
    const response = await new Promise<any>((resolve) => {
      (chrome.runtime as any).sendMessage({
        action: 'cloneRepo',
        repoInfo: currentRepoInfo
      }, resolve);
    });

    if (response && response.success) {
      showStatus('Repository cloning initiated successfully!', 'success');
    } else {
      showStatus(`Error: ${response?.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error}`, 'error');
  } finally {
    cloneButton.disabled = false;
  }
}

// Handle save settings
async function handleSaveSettings() {
  const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
  const serverUrl = serverUrlInput.value.trim();

  try {
    await new Promise<void>((resolve) => {
      (chrome.storage as any).local.set({ serverUrl }, resolve);
    });
    
    // Show temporary success message
    const saveButton = document.getElementById('save-settings') as HTMLButtonElement;
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saved!';
    saveButton.style.background = '#28a745';
    
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.style.background = '';
    }, 2000);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Show status message
function showStatus(message: string, type: 'success' | 'error' | 'info') {
  const statusElement = document.getElementById('clone-status') as HTMLDivElement;
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = 'block';

  // Hide after 5 seconds for success/info, keep error visible
  if (type !== 'error') {
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}
