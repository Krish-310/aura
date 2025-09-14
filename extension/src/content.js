// GitHub Code Explainer Extension
// Shows explanations of selected code using repository context

// Inject CSS directly
const css = `
.text-selection-tooltip {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(209, 217, 224, 0.6);
  border-radius: 16px;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #24292f;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  z-index: 2147483647;
  width: 480px;
  min-height: 80px;
  word-wrap: break-word;
  white-space: pre-wrap;
  display: none;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-8px) scale(0.95);
  overflow: hidden;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
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
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(255, 255, 255, 0.85);
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08));
}

.text-selection-tooltip.tooltip-below::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid rgba(255, 255, 255, 0.85);
  filter: drop-shadow(0 -2px 8px rgba(0, 0, 0, 0.08));
}

.text-selection-tooltip.loading {
  opacity: 0.85;
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


/* Code block styling */
.text-selection-tooltip code {
  background: rgba(246, 248, 250, 0.8);
  border: 1px solid rgba(225, 228, 232, 0.5);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
  backdrop-filter: blur(4px);
}

.text-selection-tooltip pre {
  background: rgba(246, 248, 250, 0.7);
  border: 1px solid rgba(225, 228, 232, 0.4);
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  overflow: hidden;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
  line-height: 1.5;
  backdrop-filter: blur(8px);
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

/* Streaming content container */
.tooltip-content {
  min-height: 48px;
  overflow: hidden;
  transition: height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  box-sizing: border-box;
}

.tooltip-content.scrollable {
  overflow: visible;
}

.tooltip-content.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 8px;
  color: #656d76;
  height: 100%;
  min-height: 48px;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.tooltip-content.streaming {
  padding-bottom: 20px;
}

/* Loading indicator for fixed tooltip */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

/* Streaming cursor effect */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: #0969da;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@media (prefers-color-scheme: dark) {
  .text-selection-tooltip {
    background: rgba(28, 33, 40, 0.85);
    border-color: rgba(55, 62, 71, 0.6);
    color: #f0f6fc;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .loading-spinner {
    border-color: rgba(55, 62, 71, 0.8);
    border-top-color: #58a6ff;
  }
  
  .streaming-cursor {
    background-color: #58a6ff;
  }
  
  .tooltip-content.loading {
    color: #8b949e;
  }
  
  .text-selection-tooltip.tooltip-above::before {
    border-top-color: rgba(28, 33, 40, 0.85);
  }
  
  .text-selection-tooltip.tooltip-below::before {
    border-bottom-color: rgba(28, 33, 40, 0.85);
  }
  
  .text-selection-tooltip code {
    background: rgba(22, 27, 34, 0.8);
    border-color: rgba(48, 54, 61, 0.5);
    color: #f0f6fc;
  }
  
  .text-selection-tooltip pre {
    background: rgba(22, 27, 34, 0.7);
    border-color: rgba(48, 54, 61, 0.4);
    color: #f0f6fc;
  }
  
  .text-selection-tooltip h1,
  .text-selection-tooltip h2,
  .text-selection-tooltip h3 {
    color: #f0f6fc;
  }
  
  .text-selection-tooltip h1 {
    border-bottom-color: rgba(48, 54, 61, 0.6);
  }
  
  .text-selection-tooltip strong {
    color: #f0f6fc;
  }
  
  .text-selection-tooltip hr {
    border-top-color: rgba(48, 54, 61, 0.6);
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

// Show loading state with small initial size
function showLoading() {
  const tooltip = createTooltip();
  tooltip.innerHTML = `
    <div class="tooltip-content loading">
      <div class="loading-indicator">
        <div class="loading-spinner"></div>
        <div>Analyzing code...</div>
      </div>
    </div>
  `;
  tooltip.className = "text-selection-tooltip";
  tooltip.style.display = "block";
  tooltip.style.height = "80px"; // Start with minimum height
  
  // Position tooltip ONCE - it will stay in this exact position
  positionTooltip();
  
  // Smooth fade-in animation
  requestAnimationFrame(() => {
    tooltip.classList.add('show');
  });
}

// Show explanation with enhanced formatting and dynamic height expansion
function showExplanation(explanation, isStreaming = false, contextInfo = null) {
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

  // Add context indicator if context was used
  let contextIndicator = '';
  if (contextInfo && contextInfo.snippets_found > 0) {
    const avgSimilarity = (contextInfo.avg_similarity * 100).toFixed(1);
    contextIndicator = `
      <div class="context-indicator" style="
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border: 1px solid #90caf9;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 12px;
        font-size: 11px;
        color: #1565c0;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-weight: 600;">🔍 Enhanced with ${contextInfo.snippets_found} related code snippets</span>
        <span style="opacity: 0.8;">(${avgSimilarity}% similarity)</span>
      </div>
    `;
  }

  // Add streaming cursor if still streaming
  if (isStreaming) {
    htmlContent += '<span class="streaming-cursor"></span>';
  }

  // Create content container - ensure it's contained within tooltip
  const contentClass = isStreaming ? 'tooltip-content streaming' : 'tooltip-content';
  tooltip.innerHTML = `<div class="${contentClass}">${contextIndicator}${htmlContent}</div>`;
  tooltip.className = "text-selection-tooltip show";
  tooltip.style.display = "block";
  tooltip.style.overflow = "hidden"; // Force containment
  
  // Calculate required height and adjust tooltip dynamically
  adjustTooltipHeight(tooltip, isStreaming);
}

// Position tooltip intelligently near selection - ONLY called once at creation
function positionTooltip() {
  if (!tooltip || !currentSelection) return;

  // Check if selection has ranges before accessing
  if (currentSelection.rangeCount === 0) return;
  
  const range = currentSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Use fixed dimensions for positioning calculation (480px width, start with 80px height)
  const tooltipWidth = 480;
  const initialHeight = 80;
  
  // Calculate preferred position (above selection, centered)
  let preferredLeft = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2);
  let preferredTop = rect.top + scrollTop - initialHeight - 16;
  
  // Adjust horizontal position to stay within viewport
  let finalLeft = Math.max(12, Math.min(preferredLeft, viewportWidth - tooltipWidth - 12));
  
  // Determine if we should show above or below selection
  let finalTop = preferredTop;
  let showBelow = false;
  
  // If tooltip would be cut off at the top, show it below
  if (preferredTop < scrollTop + 12) {
    finalTop = rect.bottom + scrollTop + 16;
    showBelow = true;
  }
  
  // Apply positioning - this will be the FINAL position, no more changes
  tooltip.style.position = 'absolute';
  tooltip.style.left = finalLeft + 'px';
  tooltip.style.top = finalTop + 'px';
  tooltip.style.transform = 'translateZ(0)'; // Force hardware acceleration
  
  // Add visual indicator of tooltip direction
  tooltip.classList.toggle('tooltip-below', showBelow);
  tooltip.classList.toggle('tooltip-above', !showBelow);
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

// // Call the server to get code explanation
// async function explainCode(selectedText, repoInfo) {
//   try {
//     console.log("Making request to server with:", {
//       owner: repoInfo.owner,
//       repo: repoInfo.repo,
//       sha: repoInfo.sha,
//       file: repoInfo.file,
//       selected_text: selectedText,
//       language: getLanguageFromFile(repoInfo.file),
//     });

//     try {
//       const response = await fetch("http://localhost:8787/select", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           owner: repoInfo.owner,
//           repo: repoInfo.repo,
//           sha: repoInfo.sha,
//           file: repoInfo.file,
//           selected_text: selectedText,
//           language: getLanguageFromFile(repoInfo.file),
//         }),
//         signal: currentAbort.signal
//       })

//       if (!resp.body) {
//         setText('Failed to stream (no body).')
//         return
//       }

//       const reader = resp.body.getReader()
//       const decoder = new TextDecoder()
//       let buf = ''

//       // Read chunks and update tooltip
//       while (true) {
//         const { value, done } = await reader.read()
//         if (done) break
//         buf += decoder.decode(value, { stream: true })
//         setText(buf) // live update
//       }

//       // finalize decode (flush)
//       buf += decoder.decode()
//       setText(buf || 'No output.')
    
//     } catch (err) {
//       if (err.name === 'AbortError') return;
//       setText(`Stream error: ${err.message}`);
//     }
  

  

// //     console.log("Server response status:", response.status);

// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       console.error("Server error response:", errorText);
// //       throw new Error(`Server error: ${response.status} - ${errorText}`);
// //     }

// //     const data = await response.json();
// //     console.log("Server response data:", data);
// //     return data.explanation;
//   } catch (error) {
//     console.error("Error calling explain endpoint:", error);

//     // Provide more specific error messages
//     if (error.message.includes("Failed to fetch")) {
//       return `**Connection Error:** Could not connect to the server.

// **Troubleshooting:**
// 1. Make sure the server is running: \`docker-compose up\`
// 2. Check if the server is accessible at http://localhost:8787
// 3. Try opening http://localhost:8787/status?repo=test&prNumber=1&commit=main in your browser

// **Quick Start:**
// \`\`\`bash
// cd /path/to/aura
// docker-compose up
// \`\`\``;
//     }

//     return `**Error:** Could not analyze code.

// **Details:** ${error.message}

// **Troubleshooting:**
// 1. Check if the server is running on http://localhost:8787
// 2. Try ingesting the repository first using the /ingest endpoint
// 3. Check the browser console for more details`;
//   }
// }

let currentAbort = null;

// Adjust tooltip height based on content - always expand to fit all content
function adjustTooltipHeight(tooltip, isStreaming) {
  const contentDiv = tooltip.querySelector('.tooltip-content');
  if (!contentDiv) return;
  
  // Create a temporary element to measure content height
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = '448px'; // Account for padding (480 - 32)
  tempDiv.style.fontSize = '13px';
  tempDiv.style.lineHeight = '1.5';
  tempDiv.style.fontFamily = contentDiv.style.fontFamily || 'inherit';
  tempDiv.innerHTML = contentDiv.innerHTML;
  document.body.appendChild(tempDiv);
  
  const contentHeight = tempDiv.scrollHeight;
  document.body.removeChild(tempDiv);
  
  // Calculate required tooltip height (content + padding + extra margin)
  const requiredHeight = contentHeight + 50; // Extra margin to ensure no scrollbars
  const minHeight = 80;
  
  // Always expand to fit content, no maximum limit
  const targetHeight = Math.max(requiredHeight, minHeight);
  
  // Apply height with smooth transition - NO repositioning to prevent jumping
  tooltip.style.height = targetHeight + 'px';
  
  // Remove scrollable class since we always expand
  contentDiv.classList.remove('scrollable');
  
  // DO NOT reposition - this causes jumping!
}

// Helper function to safely read response text
async function safeReadText(response) {
  try {
    return await response.text();
  } catch (e) {
    return `Error reading response: ${e.message}`;
  }
}

// Helper function to handle JSON streaming responses
function handleJSONish(payload, onDelta, onDone, onError, onContext) {
  try {
    // Only try to parse if payload looks like JSON
    if (payload.trim().startsWith("{") || payload.trim().startsWith("[")) {
      const data = JSON.parse(payload);
      console.log("[explain] Received streaming data:", data);

      if (data.type === "delta" && data.content) {
        onDelta(data.content);
      } else if (data.type === "context") {
        console.log("[explain] Context info received:", data);
        onContext(data);
      } else if (data.type === "done") {
        console.log("[explain] Stream completed");
        onDone();
      } else if (data.type === "error") {
        console.error("[explain] Server error:", data.error);
        onError(new Error(data.error));
      }
    } else {
      // Not JSON, treat as plain text delta
      onDelta(payload);
    }
  } catch (parseError) {
    console.warn("[explain] Failed to parse JSON, treating as text:", parseError);
    // If JSON parsing fails, treat as plain text
    onDelta(payload);
  }
}

export async function explainCode(
  selectedText,
  repoInfo,
  handlers = {}
) {
  const { onDelta = () => {}, onDone = () => {}, onError = () => {}, onContext = () => {} } = handlers;

  try {
    // Abort any prior in-flight stream
    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();

    const { serverUrl } = await chrome.storage.local.get(["serverUrl"]);
    const base = serverUrl || "http://localhost:8787";

    const body = JSON.stringify({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      sha: repoInfo.sha,
      file: repoInfo.file,
      selected_text: selectedText,
      language: getLanguageFromFile(repoInfo.file),
    });

    console.log("[explain] POST", `${base}/select`, {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      sha: repoInfo.sha,
      file: repoInfo.file,
      selectedTextLength: selectedText.length,
      language: getLanguageFromFile(repoInfo.file),
    });
    
    console.log("[explain] Selected text preview:", selectedText.substring(0, 100) + (selectedText.length > 100 ? "..." : ""));
    console.log("[explain] Requesting context from ChromaDB collection:", `${repoInfo.owner}_${repoInfo.repo}`);

    const resp = await fetch(`${base}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: currentAbort.signal,
    });

    if (!resp.ok) {
      const txt = await safeReadText(resp);
      console.error("[explain] HTTP", resp.status, txt);
      onError(`Server error ${resp.status}: ${txt || resp.statusText}`);
      return;
    }

    if (!resp.body) {
      console.error("[explain] No response.body (streaming unsupported)");
      onError("Failed to stream (no response body)");
      return;
    }

    const ctype = resp.headers.get("content-type") || "";
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    // Streaming buffers
    let buf = "";
    let sseMode = ctype.includes("text/event-stream");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buf += chunk;

      if (sseMode) {
        // Server-sent events: split by double newline
        let dblIdx;
        while ((dblIdx = buf.indexOf("\n\n")) !== -1) {
          const event = buf.slice(0, dblIdx).trim();
          buf = buf.slice(dblIdx + 2);
          if (!event) continue;
          handleSSE(event, onDelta, onDone, onError);
        }
      } else if (ctype.includes("application/x-ndjson")) {
        // NDJSON: split by single newline; parse each line
        let nlIdx;
        while ((nlIdx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nlIdx).trim();
          buf = buf.slice(nlIdx + 1);
          if (!line) continue;
          handleJSONish(line, onDelta, onDone, onError, onContext);
        }
      } else if (textMode || !ctype) {
        // Plain text (or unknown): stream as-is
        onDelta(buf);
        buf = "";
      }
    }

    // Flush trailing data
    const tail = decoder.decode();
    if (tail) buf += tail;

    if (sseMode || ctype.includes("application/x-ndjson")) {
      // NDJSON/SSE: there may be a small tail (empty or whitespace)
      if (buf.trim()) {
        // Try parse once; if not JSON, ignore
        handleJSONish(buf.trim(), onDelta, onDone, onError);
      }
      onDone();
      return;
    }

    // Plain text fallback (compat with your old "[stream-error]" pattern)
    if (buf.includes("[stream-error]")) {
      const msg = buf.split("[stream-error]").pop()?.trim() || "Unknown error";
      console.error("[explain] stream-error:", msg);
      onError(`Stream error from server: ${msg}`);
      return;
    }

    // If we streamed raw text progressively, we're done
    if (buf) onDelta(buf);
    onDone();
  } catch (err) {
    if (err?.name === "AbortError") {
      console.log("[explain] aborted");
      return;
    }
    console.error("[explain] exception:", err);
    onError(err);
  } finally {
    currentAbort = null;
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
      let explanationText = "";
      let contextInfo = null;
      let deltaBuffer = "";
      let lastUpdateTime = 0;
      const updateInterval = 50; // ms - throttle updates to prevent text overflow
      
      await explainCode(selectedText, repoInfo, {
        onDelta: (delta) => {
          if (currentSelection === selection) {
            deltaBuffer += delta;
            const now = Date.now();
            
            // Throttle updates to allow box to expand smoothly
            if (now - lastUpdateTime >= updateInterval) {
              explanationText += deltaBuffer;
              deltaBuffer = "";
              lastUpdateTime = now;
              
              // Show explanation with streaming indicator and context info
              showExplanation(explanationText, true, contextInfo);
            }
          }
        },
        onDone: () => {
          console.log("[explain] Explanation complete. Total length:", explanationText.length);
          console.log("[explain] Final explanation:", explanationText);
          if (contextInfo) {
            console.log("[explain] Context used:", contextInfo);
          }
          if (currentSelection === selection) {
            // Add any remaining buffered text
            if (deltaBuffer) {
              explanationText += deltaBuffer;
            }
            // Remove streaming cursor when done
            showExplanation(explanationText, false, contextInfo);
          }
        },
        onContext: (context) => {
          contextInfo = context;
          console.log("[explain] Context information received:", context);
        },
        onError: (error) => {
          console.error("[explain] Error getting explanation:", error);
          if (currentSelection === selection) {
            showExplanation(
              "**Error:** Could not analyze code. Please check the console for details.",
              false
            );
          }
        }
      });
    } catch (error) {
      console.error("Error getting explanation:", error);
      if (currentSelection === selection) {
        showExplanation(
          "**Error:** Could not analyze code. Please check the console for details.",
          false
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
