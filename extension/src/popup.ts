// Popup script for Aura extension

interface RepoInfo {
  owner: string;
  repo: string;
  url: string;
}

interface VectorizationStatus {
  status: string;
  stage?: string;
  progress_percent: number;
  total_files?: number;
  processed_files?: number;
  total_chunks?: number;
  processed_chunks?: number;
  current_file?: string;
  collection_name?: string;
  duration?: number;
  error?: string;
}

let currentRepoInfo: RepoInfo | null = null;
let statusCheckInterval: number | null = null;

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

  // Vectorize button
  const vectorizeButton = document.getElementById('vectorize-button');
  vectorizeButton?.addEventListener('click', handleVectorizeRepositoryClick);

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
      const message = response.localPath 
        ? `Repository cloned successfully to: ${response.localPath}`
        : 'Repository cloned successfully to ~/.aura directory';
      showStatus(message, 'success');
      
      // Enable vectorization button after successful clone
      enableVectorizeButton();
      await checkVectorizationStatus();
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

// Enable vectorize button
function enableVectorizeButton() {
  const vectorizeButton = document.getElementById('vectorize-button') as HTMLButtonElement;
  const vectorizationInfo = document.getElementById('vectorization-info');
  
  vectorizeButton.disabled = false;
  if (vectorizationInfo && currentRepoInfo) {
    vectorizationInfo.textContent = `Ready to vectorize ${currentRepoInfo.owner}/${currentRepoInfo.repo}`;
  }
}

// Handle repository vectorization
async function handleVectorizeRepositoryClick() {
  if (!currentRepoInfo) return;

  const vectorizeButton = document.getElementById('vectorize-button') as HTMLButtonElement;
  
  try {
    vectorizeButton.disabled = true;
    showVectorizationStatus('Starting vectorization...', 'info');

    // Get server URL from settings
    const storage = await new Promise<any>((resolve) => {
      (chrome.storage as any).local.get(['serverUrl'], resolve);
    });
    const serverUrl = storage.serverUrl || 'http://localhost:8787';

    // Start vectorization
    const response = await fetch(`${serverUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: currentRepoInfo.owner,
        repo: currentRepoInfo.repo
      })
    });

    const result = await response.json();

    if (result.success) {
      showVectorizationStatus('Vectorization started successfully', 'success');
      startStatusPolling();
    } else {
      showVectorizationStatus(`Error: ${result.message}`, 'error');
      vectorizeButton.disabled = false;
    }
  } catch (error) {
    showVectorizationStatus(`Error: ${error}`, 'error');
    vectorizeButton.disabled = false;
  }
}

// Check vectorization status
async function checkVectorizationStatus() {
  if (!currentRepoInfo) return;

  try {
    const storage = await new Promise<any>((resolve) => {
      (chrome.storage as any).local.get(['serverUrl'], resolve);
    });
    const serverUrl = storage.serverUrl || 'http://localhost:8787';

    const response = await fetch(`${serverUrl}/ingest/status/${currentRepoInfo.owner}/${currentRepoInfo.repo}`);
    const status: VectorizationStatus = await response.json();

    updateVectorizationDisplay(status);
    
    // If in progress, start polling
    if (status.status === 'starting' || status.status === 'in_progress') {
      startStatusPolling();
    }
  } catch (error) {
    console.error('Error checking vectorization status:', error);
  }
}

// Start polling for status updates
function startStatusPolling() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }

  statusCheckInterval = window.setInterval(async () => {
    await checkVectorizationStatus();
  }, 2000); // Poll every 2 seconds
}

// Stop polling
function stopStatusPolling() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
}

// Update vectorization display
function updateVectorizationDisplay(status: VectorizationStatus) {
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill') as HTMLDivElement;
  const progressText = document.getElementById('progress-text');
  const detailsElement = document.getElementById('vectorization-details');
  const vectorizeButton = document.getElementById('vectorize-button') as HTMLButtonElement;

  // Update progress bar
  if (progressContainer && progressFill && progressText) {
    if (status.status === 'starting' || status.status === 'in_progress') {
      progressContainer.style.display = 'block';
      progressFill.style.width = `${status.progress_percent}%`;
      progressText.textContent = `${status.progress_percent}%`;
    } else {
      progressContainer.style.display = 'none';
    }
  }

  // Update details
  if (detailsElement) {
    let details = '';
    
    if (status.stage) {
      details += `Stage: ${status.stage}\n`;
    }
    
    if (status.processed_files && status.total_files) {
      details += `Files: ${status.processed_files}/${status.total_files}\n`;
    }
    
    if (status.processed_chunks && status.total_chunks) {
      details += `Chunks: ${status.processed_chunks}/${status.total_chunks}\n`;
    }
    
    if (status.current_file) {
      const fileName = status.current_file.split('/').pop() || status.current_file;
      details += `Current: ${fileName}\n`;
    }
    
    if (status.duration) {
      details += `Duration: ${status.duration.toFixed(1)}s\n`;
    }

    if (details) {
      detailsElement.textContent = details.trim();
      detailsElement.style.display = 'block';
    } else {
      detailsElement.style.display = 'none';
    }
  }

  // Update status message and button state
  switch (status.status) {
    case 'not_started':
      showVectorizationStatus('Ready to start vectorization', 'info');
      vectorizeButton.disabled = false;
      vectorizeButton.textContent = 'Start Vectorization';
      stopStatusPolling();
      break;
      
    case 'starting':
    case 'in_progress':
      showVectorizationStatus(`Vectorization in progress: ${status.stage || 'processing'}`, 'info');
      vectorizeButton.disabled = true;
      vectorizeButton.textContent = 'Vectorizing...';
      break;
      
    case 'completed':
      showVectorizationStatus(`Vectorization completed! Collection: ${status.collection_name}`, 'success');
      vectorizeButton.disabled = false;
      vectorizeButton.textContent = 'Re-vectorize';
      stopStatusPolling();
      break;
      
    case 'failed':
      showVectorizationStatus(`Vectorization failed: ${status.error}`, 'error');
      vectorizeButton.disabled = false;
      vectorizeButton.textContent = 'Retry Vectorization';
      stopStatusPolling();
      break;
  }
}

// Show vectorization status message
function showVectorizationStatus(message: string, type: 'success' | 'error' | 'info') {
  const statusElement = document.getElementById('vectorization-status') as HTMLDivElement;
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
