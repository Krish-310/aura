export type Range = { start: number; end: number }
export type SummarizeRequest = {
  owner: string
  repo: string
  pr: number
  sha: string
  file: string
  range: Range
  language: string
}
