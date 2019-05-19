function activateQuickJump() {
  const permittedSchemas = ['http:', 'https:', 'file:', 'ftp:']

  function activateQuickJumpInStandaloneMode() {
    chrome.tabs.create({
      active: true,
      url: chrome.runtime.getURL('/quick-jump.html'),
    })
  }

  chrome.windows.getLastFocused(lastFocusedWindow => {
    chrome.tabs.query({ active: true, windowId: lastFocusedWindow.id }, ([tab]) => {
      const url = new URL(tab.url)
      const isPermittedSchema = permittedSchemas.includes(url.protocol)
      const isPermittedHost = url.host !== 'chrome.google.com'
      if (isPermittedSchema && isPermittedHost) {
        try {
          chrome.tabs.executeScript({ file: 'inject-iframe.js' })
        } catch (e) {
          // TODO 这个 catch 似乎并不能捕获到错误
          console.log(
            `chrome.tabs.executeScript({ file: 'inject-iframe.js' }) failed due to: ${e.message}`,
          )
          activateQuickJumpInStandaloneMode()
        }
      } else {
        activateQuickJumpInStandaloneMode()
      }
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'activate-quick-jump',
    title: '打开 quick jump',
    contexts: ['page_action'],
  })
  chrome.contextMenus.create({
    id: 'shortcut-setting',
    title: '配置快捷键',
    contexts: ['page_action'],
  })
})

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'activate-quick-jump') {
    activateQuickJump()
  } else if (info.menuItemId === 'shortcut-setting') {
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts',
    })
  }
})

chrome.commands.onCommand.addListener(command => {
  if (command === 'activate-quick-jump') {
    activateQuickJump()
  }
})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'request-for-tabs-info') {
    chrome.tabs.query({}, tabs => {
      sendResponse(tabs)
    })
    // 返回 true 表示我们将会异步地调用 `sendResponse`
    return true
  } else if (request.type === 'jump-to-tab') {
    chrome.tabs.update(request.tab.id, { active: true })
    chrome.windows.update(request.tab.windowId, { focused: true })
  }
})
