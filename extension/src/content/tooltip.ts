import { computePosition, offset, flip, shift } from '@floating-ui/dom'

let tooltip: HTMLDivElement | null = null

export function ensureTooltip() {
  if (tooltip) return tooltip
  tooltip = document.createElement('div')
  Object.assign(tooltip.style, {
    position: 'fixed', zIndex: '2147483647', maxWidth: '320px',
    background: 'var(--color-canvas-default, #0d1117)', color: '#c9d1d9',
    border: '1px solid rgba(110,118,129,0.4)', borderRadius: '8px',
    padding: '8px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    font: '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    pointerEvents: 'none', whiteSpace: 'pre-wrap'
  } as CSSStyleDeclaration)
  document.body.appendChild(tooltip)
  return tooltip
}

export async function placeTooltip(referenceEl: HTMLElement) {
  const { x, y } = await computePosition(referenceEl, tooltip!, { middleware: [offset(8), flip(), shift()] })
  Object.assign(tooltip!.style, { left: `${x}px`, top: `${y}px` })
}

export function setSkeleton() {
  if (!tooltip) return
  tooltip.innerHTML = `<div style="opacity:.7">Summarizing…</div>`
}

export function setText(text: string) {
  if (!tooltip) return
  tooltip.textContent = text
}

export function hideTooltip() {
  tooltip?.remove()
  tooltip = null
}
