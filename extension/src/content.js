// Text Selection Tooltip Extension
// Shows selected text in a tooltip above the selection

// Inject CSS directly since ES6 imports don't work in content scripts
const css = `
.text-selection-tooltip {
  position: absolute;
  background-color: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: #24292f;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2147483647;
  max-width: 300px;
  word-wrap: break-word;
  white-space: pre-wrap;
  display: none;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
}

.text-selection-tooltip.show {
  opacity: 1;
}

@media (prefers-color-scheme: dark) {
  .text-selection-tooltip {
    background-color: #21262d;
    border-color: #30363d;
    color: #f0f6fc;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.text-selection-tooltip * {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}
`;

// Inject CSS
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

console.log("Text Selection Tooltip extension loaded!");

let tooltip = null;
let currentSelection = null;

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
  console.log("Tooltip parent:", tooltip.parentElement);

  return tooltip;
}

// Show tooltip with selected text
function showTooltip(selection) {
  if (!selection || selection.toString().trim() === "") {
    hideTooltip();
    return;
  }

  const tooltip = createTooltip();
  tooltip.textContent = selection.toString();
  console.log("Tooltip created with text:", selection.toString());

  // Get selection position
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  console.log("Selection rect:", rect);

  // Position tooltip above the selection
  const tooltipRect = tooltip.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Center the tooltip horizontally over the selection
  const left = rect.left + scrollLeft + rect.width / 2 - tooltipRect.width / 2;
  const top = rect.top + scrollTop - tooltipRect.height - 8; // 8px gap above selection

  // Ensure tooltip stays within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let finalLeft = Math.max(
    8,
    Math.min(left, viewportWidth - tooltipRect.width - 8)
  );
  let finalTop = Math.max(8, top);

  // If tooltip would go above viewport, show it below the selection
  if (finalTop < 8) {
    finalTop = rect.bottom + scrollTop + 8;
  }

  console.log("Positioning tooltip at:", finalLeft, finalTop);
  console.log("Tooltip dimensions:", tooltipRect.width, tooltipRect.height);

  tooltip.style.left = finalLeft + "px";
  tooltip.style.top = finalTop + "px";
  tooltip.style.display = "block";
  tooltip.style.opacity = "1"; // Force opacity to 1
  tooltip.classList.add("show"); // Add show class

  console.log("Tooltip styles applied:", {
    left: tooltip.style.left,
    top: tooltip.style.top,
    display: tooltip.style.display,
    opacity: tooltip.style.opacity,
  });

  currentSelection = selection;
}

// Hide the tooltip
function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = "none";
  }
  currentSelection = null;
}

// Handle text selection
function handleSelection() {
  const selection = window.getSelection();
  console.log(
    "Selection event triggered:",
    selection ? selection.toString() : "no selection"
  );

  if (selection && selection.toString().trim() !== "") {
    console.log("Showing tooltip for:", selection.toString());
    showTooltip(selection);
  } else {
    console.log("Hiding tooltip");
    hideTooltip();
  }
}

// Handle clicks to hide tooltip when clicking elsewhere
function handleClick(event) {
  // Small delay to allow selection events to fire first
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
    showTooltip(currentSelection);
  }
}

// Handle window resize to reposition tooltip
function handleResize() {
  if (tooltip && tooltip.style.display === "block" && currentSelection) {
    showTooltip(currentSelection);
  }
}

// Initialize event listeners
function init() {
  console.log("Initializing text selection tooltip extension...");

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

  console.log("Event listeners attached successfully");
}

// Start the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
