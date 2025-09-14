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
    
    // Also trigger browser download as fallback
    await downloadRepositoryZip(repoInfo);
    
    return { success: true };
  } catch (error) {
    console.error('Error cloning repository:', error);
    
    // Fallback to browser download only
    try {
      await downloadRepositoryZip(repoInfo);
      return { success: true };
    } catch (downloadError) {
      return { 
        success: false, 
        error: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Download repository as ZIP file
async function downloadRepositoryZip(repoInfo: { owner: string; repo: string }): Promise<void> {
  const downloadUrls = [
    `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/main.zip`,
    `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/master.zip`
  ];

  for (const url of downloadUrls) {
    try {
      await new Promise<void>((resolve, reject) => {
        (chrome.downloads as any).download({ 
          url,
          filename: `${repoInfo.repo}.zip`
        }, (downloadId: number) => {
          if ((chrome.runtime as any).lastError) {
            reject(new Error((chrome.runtime as any).lastError.message));
          } else {
            resolve();
          }
        });
      });
      return; // Success, exit the loop
    } catch (error) {
      console.log(`Failed to download from ${url}, trying next...`);
      continue;
    }
  }
  
  throw new Error('Failed to download repository from any branch');
}