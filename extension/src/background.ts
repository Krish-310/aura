// Background script for Aura extension

interface CloneRequest {
  action: 'cloneRepo';
  repoInfo: {
    owner: string;
    repo: string;
    url: string;
  };
}

interface CloneResponse {
  success: boolean;
  error?: string;
  message?: string;
  localPath?: string;
}

// Handle messages from popup and content scripts
(chrome.runtime as any).onMessage.addListener((request: CloneRequest, sender: any, sendResponse: any) => {
  if (request.action === 'cloneRepo') {
    handleCloneRepository(request.repoInfo)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Handle repository cloning
async function handleCloneRepository(repoInfo: { owner: string; repo: string; url: string }): Promise<CloneResponse> {
  try {
    // Get server URL from storage
    const storage = await new Promise<any>((resolve) => {
      (chrome.storage as any).local.get(['serverUrl'], resolve);
    });
    const baseUrl = storage.serverUrl || 'http://localhost:8787';

    // Call backend API to clone repository
    const response = await fetch(`${baseUrl}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        url: repoInfo.url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return { 
      success: true,
      message: result.message,
      localPath: result.local_path
    };
  } catch (error) {
    console.error('Error cloning repository:', error);
    return { 
      success: false, 
      error: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
