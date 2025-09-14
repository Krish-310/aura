const root = document.getElementById('app')!
root.innerHTML = `
  <main style="font: 14px system-ui; padding: 24px; max-width: 640px">
    <h1>GitHub Hover AI — Settings</h1>
    <label>Server URL <input id="server" style="width:100%"/></label>
    <label>GitHub Token (optional for private repos) <input id="pat" style="width:100%"/></label>
    <button id="save">Save</button>
    <p id="status"></p>
  </main>`

const server = document.getElementById('server') as HTMLInputElement
const pat = document.getElementById('pat') as HTMLInputElement
const status = document.getElementById('status')!

chrome.storage.local.get(['serverUrl', 'githubToken'], (res) => {
  server.value = res.serverUrl || ''
  pat.value = res.githubToken || ''
})

document.getElementById('save')!.addEventListener('click', () => {
  chrome.storage.local.set({ serverUrl: server.value, githubToken: pat.value }, () => {
    status.textContent = 'Saved.'
    setTimeout(() => (status.textContent = ''), 1000)
  })
})
