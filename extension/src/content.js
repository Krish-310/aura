// GitHub Code Explainer Extension
// Shows explanations of selected code using repository context

// Inject CSS directly
const css = `
.text-selection-tooltip {
  position: absolute;
  background-color: #ffffff;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #24292f;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 2147483647;
  max-width: 480px;
  max-height: 70vh;
  word-wrap: break-word;
  white-space: pre-wrap;
  display: none;
  pointer-events: auto;
  opacity: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-8px) scale(0.95);
  overflow-y: auto;
  overflow-x: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.text-selection-tooltip.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.text-selection-tooltip.tooltip-above::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.text-selection-tooltip.tooltip-below::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #ffffff;
  filter: drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1));
}

.text-selection-tooltip.loading {
  opacity: 0.9;
}

.text-selection-tooltip.loading::after {
  content: '';
  position: absolute;
  top: 16px;
  right: 16px;
  width: 16px;
  height: 16px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.text-selection-tooltip::-webkit-scrollbar {
  width: 6px;
}

.text-selection-tooltip::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.text-selection-tooltip::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.text-selection-tooltip::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Code block styling */
.text-selection-tooltip code {
  background-color: #f6f8fa;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
}

.text-selection-tooltip pre {
  background-color: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
  line-height: 1.45;
}

.text-selection-tooltip pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}

/* Headers */
.text-selection-tooltip h1,
.text-selection-tooltip h2,
.text-selection-tooltip h3 {
  margin: 12px 0 8px 0;
  font-weight: 600;
  color: #24292f;
}

.text-selection-tooltip h1 {
  font-size: 16px;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 8px;
}

.text-selection-tooltip h2 {
  font-size: 14px;
}

.text-selection-tooltip h3 {
  font-size: 13px;
}

/* Lists */
.text-selection-tooltip ul {
  margin: 8px 0;
  padding-left: 20px;
}

.text-selection-tooltip li {
  margin: 4px 0;
}

/* Links */
.text-selection-tooltip a {
  color: #0366d6;
  text-decoration: none;
}

.text-selection-tooltip a:hover {
  text-decoration: underline;
}

/* Strong/Bold text */
.text-selection-tooltip strong {
  font-weight: 600;
  color: #24292f;
}

/* Horizontal rule */
.text-selection-tooltip hr {
  border: none;
  border-top: 1px solid #e1e4e8;
  margin: 16px 0;
}

@media (prefers-color-scheme: dark) {
  .text-selection-tooltip {
    background-color: #1c2128;
    border-color: #373e47;
    color: #f0f6fc;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .text-selection-tooltip.tooltip-above::before {
    border-top-color: #1c2128;
  }
  
  .text-selection-tooltip.tooltip-below::before {
    border-bottom-color: #1c2128;
  }
  
  .text-selection-tooltip.loading::after {
    border-color: #373e47;
    border-top-color: #58a6ff;
  }
  
  .text-selection-tooltip code {
    background-color: #161b22;
    color: #f0f6fc;
  }
  
  .text-selection-tooltip pre {
    background-color: #161b22;
    border-color: #30363d;
    color: #f0f6fc;
  }
  
  .text-selection-tooltip h1,
  .text-selection-tooltip h2,
  .text-selection-tooltip h3 {
    color: #f0f6fc;
  }
  
  .text-selection-tooltip h1 {
    border-bottom-color: #30363d;
  }
  
  .text-selection-tooltip strong {
    color: #f0f6fc;
  }
  
  .text-selection-tooltip hr {
    border-top-color: #30363d;
  }
  
  .text-selection-tooltip::-webkit-scrollbar-track {
    background: #30363d;
  }
  
  .text-selection-tooltip::-webkit-scrollbar-thumb {
    background: #586069;
  }
  
  .text-selection-tooltip::-webkit-scrollbar-thumb:hover {
    background: #6a737d;
  }
}
`;

// Inject CSS
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

console.log("GitHub Code Explainer extension loaded!");

let tooltip = null;
let currentSelection = null;
let isLoading = false;

// Check if we're on a GitHub page
function isGitHubPage() {
  return (
    window.location.hostname === "github.com" &&
    (window.location.pathname.includes("/blob/") ||
      window.location.pathname.includes("/pull/"))
  );
}

// Extract repository info from GitHub URL
function getRepoInfo() {
  const pathParts = window.location.pathname.split("/");
  if (pathParts.length >= 3) {
    return {
      owner: pathParts[1],
      repo: pathParts[2],
      sha: pathParts[4] || "main", // Use 'main' as default if no SHA in URL
      file: pathParts.slice(5).join("/"), // Everything after the SHA
    };
  }
  return null;
}

// Create the tooltip element
function createTooltip() {
  if (tooltip) {
    console.log("Reusing existing tooltip");
    return tooltip;
  }

  console.log("Creating new tooltip element");
  tooltip = document.createElement("div");
  tooltip.id = "text-selection-tooltip";
  tooltip.className = "text-selection-tooltip";
  document.body.appendChild(tooltip);

  console.log("Tooltip element created and added to DOM:", tooltip);
  return tooltip;
}

// Show loading state with better UX
function showLoading() {
  const tooltip = createTooltip();
  tooltip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; color: #656d76;">
      <div style="font-weight: 500;">Analyzing code...</div>
    </div>
  `;
  tooltip.className = "text-selection-tooltip loading";
  tooltip.style.display = "block";
  
  // Smooth fade-in animation
  requestAnimationFrame(() => {
    tooltip.classList.add('show');
    positionTooltip();
  });
}

// Show explanation with enhanced formatting and animation
function showExplanation(explanation) {
  const tooltip = createTooltip();

  // Convert markdown-like formatting to HTML
  let htmlContent = explanation
    // Convert headers
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    // Convert code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    // Convert inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Convert bold text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Convert horizontal rules
    .replace(/^---$/gim, "<hr>")
    // Convert line breaks
    .replace(/\n/g, "<br>");

  // Remove loading class and add content
  tooltip.classList.remove('loading');
  tooltip.innerHTML = htmlContent;
  tooltip.className = "text-selection-tooltip show";
  tooltip.style.display = "block";
  
  // Smooth transition from loading to content
  requestAnimationFrame(() => {
    positionTooltip();
  });
}

// Position tooltip intelligently near selection
function positionTooltip() {
  if (!tooltip || !currentSelection) return;

  const range = currentSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Wait for tooltip to be rendered to get accurate dimensions
  requestAnimationFrame(() => {
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate preferred position (above selection, centered)
    let preferredLeft = rect.left + scrollLeft + (rect.width / 2) - (tooltipRect.width / 2);
    let preferredTop = rect.top + scrollTop - tooltipRect.height - 16;
    
    // Adjust horizontal position to stay within viewport
    let finalLeft = Math.max(12, Math.min(preferredLeft, viewportWidth - tooltipRect.width - 12));
    
    // Determine if we should show above or below selection
    let finalTop = preferredTop;
    let showBelow = false;
    
    // If tooltip would be cut off at the top, show it below
    if (preferredTop < scrollTop + 12) {
      finalTop = rect.bottom + scrollTop + 16;
      showBelow = true;
    }
    
    // If showing below would cut off at bottom, try to fit above with adjustment
    if (showBelow && (finalTop + tooltipRect.height > scrollTop + viewportHeight - 12)) {
      // Try to fit above by reducing the gap
      const aboveTop = rect.top + scrollTop - tooltipRect.height - 8;
      if (aboveTop >= scrollTop + 12) {
        finalTop = aboveTop;
        showBelow = false;
      } else {
        // Keep it below but adjust to fit
        finalTop = Math.max(scrollTop + 12, scrollTop + viewportHeight - tooltipRect.height - 12);
      }
    }
    
    // Apply smooth positioning with transform for better performance
    tooltip.style.position = 'absolute';
    tooltip.style.left = finalLeft + 'px';
    tooltip.style.top = finalTop + 'px';
    tooltip.style.transform = 'translateZ(0)'; // Force hardware acceleration
    
    // Add visual indicator of tooltip direction
    tooltip.classList.toggle('tooltip-below', showBelow);
    tooltip.classList.toggle('tooltip-above', !showBelow);
  });
}

// Hide the tooltip with smooth animation
function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove('show');
    tooltip.classList.remove('tooltip-above', 'tooltip-below');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      if (tooltip) {
        tooltip.style.display = "none";
      }
    }, 250);
  }
  currentSelection = null;
  isLoading = false;
}

// Call the server to get code explanation
async function explainCode(selectedText, repoInfo) {
  try {
    console.log("Making request to server with:", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      sha: repoInfo.sha,
      file: repoInfo.file,
      selected_text: selectedText,
      language: getLanguageFromFile(repoInfo.file),
    });

    const response = await fetch("http://localhost:8787/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        sha: repoInfo.sha,
        file: repoInfo.file,
        selected_text: selectedText,
        language: getLanguageFromFile(repoInfo.file),
      }),
    });

    console.log("Server response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Server response data:", data);
    return data.explanation;
  } catch (error) {
    console.error("Error calling explain endpoint:", error);

    // Provide more specific error messages
    if (error.message.includes("Failed to fetch")) {
      return `**Connection Error:** Could not connect to the server.

**Troubleshooting:**
1. Make sure the server is running: \`docker-compose up\`
2. Check if the server is accessible at http://localhost:8787
3. Try opening http://localhost:8787/status?repo=test&prNumber=1&commit=main in your browser

**Quick Start:**
\`\`\`bash
cd /path/to/aura
docker-compose up
\`\`\``;
    }

    return `**Error:** Could not analyze code.

**Details:** ${error.message}

**Troubleshooting:**
1. Check if the server is running on http://localhost:8787
2. Try ingesting the repository first using the /ingest endpoint
3. Check the browser console for more details`;
  }
}

// Get language from file extension
function getLanguageFromFile(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
  };
  return langMap[ext] || "text";
}

// Handle text selection with improved UX
async function handleSelection() {
  if (!isGitHubPage()) {
    hideTooltip();
    return;
  }

  const selection = window.getSelection();
  console.log(
    "Selection event triggered:",
    selection ? selection.toString() : "no selection"
  );

  if (selection && selection.toString().trim() !== "") {
    const selectedText = selection.toString().trim();
    
    // Only process selections with meaningful content (more than 3 characters)
    if (selectedText.length < 4) {
      hideTooltip();
      return;
    }
    
    const repoInfo = getRepoInfo();

    if (!repoInfo) {
      console.log("Could not extract repo info from URL");
      hideTooltip();
      return;
    }

    console.log("Showing explanation for:", selectedText);
    console.log("Repo info:", repoInfo);

    // Prevent multiple simultaneous requests
    if (isLoading) {
      return;
    }
    
    isLoading = true;
    currentSelection = selection;
    showLoading();

    try {
      const explanation = await explainCode(selectedText, repoInfo);
      if (currentSelection === selection) { // Only show if selection hasn't changed
        showExplanation(explanation);
      }
    } catch (error) {
      console.error("Error getting explanation:", error);
      if (currentSelection === selection) {
        showExplanation(
          "**Error:** Could not analyze code. Please check the console for details."
        );
      }
    } finally {
      isLoading = false;
    }
  } else {
    console.log("Hiding tooltip");
    hideTooltip();
  }
}

// Handle clicks to hide tooltip when clicking elsewhere
function handleClick(event) {
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      hideTooltip();
    }
  }, 10);
}

// Handle scroll to reposition tooltip
function handleScroll() {
  if (tooltip && tooltip.style.display === "block" && currentSelection) {
    positionTooltip();
  }
}

// Handle window resize to reposition tooltip
function handleResize() {
  if (tooltip && tooltip.style.display === "block" && currentSelection) {
    positionTooltip();
  }
}

// Initialize event listeners
function init() {
  console.log("Initializing GitHub Code Explainer extension...");

  // Listen for text selection
  document.addEventListener("mouseup", handleSelection);
  document.addEventListener("keyup", handleSelection);

  // Listen for clicks to hide tooltip
  document.addEventListener("click", handleClick);

  // Listen for scroll and resize to reposition tooltip
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);

  // Hide tooltip when page unloads
  window.addEventListener("beforeunload", hideTooltip);

  // Add a "Clone" button to the page
  addCloneButton();

  console.log("Event listeners attached successfully");
}

// Add a "Clone" button to the page
function addCloneButton() {
  if (!isGitHubRepoPage()) {
    return;
  }

  const buttonContainer = document.querySelector('.d-flex.flex-wrap.flex-justify-end.ml-auto');
  if (buttonContainer) {
    const cloneButton = document.createElement('button');
    cloneButton.className = 'btn btn-sm btn-primary ml-2';
    cloneButton.textContent = 'Clone';
    cloneButton.addEventListener('click', () => {
      const repoUrl = window.location.href;
      chrome.runtime.sendMessage({ action: 'cloneRepo', repoUrl: repoUrl });
    });
    buttonContainer.appendChild(cloneButton);
  }
}

// Check if we're on a GitHub repository page
function isGitHubRepoPage() {
  const repoNav = document.querySelector('nav[aria-label="Repository"]');
  return repoNav !== null;
}



// Start the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
