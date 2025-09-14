import { ensureTooltip, placeTooltip, setSkeleton, setText, hideTooltip } from './tooltip'
import { detectFunctionContext } from './ast'

let hoverTimer: number | null = null
const HOVER_DELAY = 250

function shouldActivate(): boolean {
  return /\/pull\//.test(location.pathname)
}

document.addEventListener('mouseover', (e) => {
  if (!shouldActivate()) return
  const el = (e.target as HTMLElement).closest('.blob-code, .diff-table .blob-code-inner, .diff-line') as HTMLElement | null
  if (!el) return
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = window.setTimeout(async () => {
    const ctx = detectFunctionContext(el)
    if (!ctx) return
    const tip = ensureTooltip()
    setSkeleton()
    await placeTooltip(el)

    const { serverUrl } = await chrome.storage.local.get(['serverUrl'])
    const resp = await fetch(`${serverUrl || 'http://localhost:8787'}/summarize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ctx)
    })

    // simple JSON first; can switch to streaming later
    const data = await resp.json()
    setText(data.summary || 'No summary')
  }, HOVER_DELAY)
})

document.addEventListener('mouseout', () => {
  if (hoverTimer) clearTimeout(hoverTimer)
  hideTooltip()
})
