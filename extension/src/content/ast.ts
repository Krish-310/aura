import type { SummarizeRequest } from '../types'

export function detectFunctionContext(targetEl: HTMLElement): Omit<SummarizeRequest, 'language' | 'range'> & { range: { start: number; end: number }, language: string } | null {
  // Minimal MVP: use data-line-number attributes in GitHub diff table to guess range
  const row = targetEl.closest('tr') as HTMLTableRowElement | null
  if (!row) return null

  const fileHeader = row.closest('.js-file')!.querySelector('.file-info a') as HTMLAnchorElement
  const filePath = fileHeader?.getAttribute('title') || fileHeader?.textContent || ''
  const language = (filePath.split('.').pop() || 'txt')

  // naive range: current line only
  const lnEl = row.querySelector('[data-line-number]') as HTMLElement
  const ln = Number(lnEl?.getAttribute('data-line-number') || '0')
  if (!ln) return null

  const [owner, repo] = window.location.pathname.split('/').filter(Boolean)
  const pr = Number(window.location.pathname.split('/pull/')[1]?.split('/')[0])
  const sha = (document.querySelector('clipboard-copy[aria-label="Copy commit SHA"]') as any)?.value || ''

  return {
    owner, repo, pr, sha, file: filePath, language,
    range: { start: ln, end: ln }
  }
}
