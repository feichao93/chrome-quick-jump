function activateQuickJump() {
  const permittedSchemas = ['http:', 'https:', 'file:', 'ftp:']

  chrome.windows.getLastFocused(lastFocusedWindow => {
    chrome.tabs.query({ active: true, windowId: lastFocusedWindow.id }, ([tab]) => {
      const isPermittedSchema = permittedSchemas.includes(new URL(tab.url).protocol)
      if (isPermittedSchema) {
        chrome.tabs.executeScript({ file: 'inject-iframe.js' })
      } else {
        chrome.tabs.create({
          active: true,
          url: chrome.runtime.getURL('/quick-jump.html'),
        })
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
