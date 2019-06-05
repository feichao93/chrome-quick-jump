const quickJumpUrl = chrome.runtime.getURL('/quick-jump.html')

function ensurePortReady(tab, callback) {
  if (portByTabId.has(tab.id)) {
    Promise.resolve(portByTabId.get(tab.id)).then(callback)
  } else {
    const listener = port => {
      if (port.sender.tab.id === tab.id) {
        callback(port)
        chrome.runtime.onConnect.removeListener(listener)
      }
    }
    chrome.runtime.onConnect.addListener(listener)
  }
}

const portByTabId = new Map()

function activateQuickJump() {
  const permittedSchemas = ['http:', 'https:', 'file:', 'ftp:']

  function activateQuickJumpInStandaloneMode(callback) {
    chrome.tabs.create(
      {
        active: true,
        url: quickJumpUrl,
      },
      callback,
    )
  }

  chrome.windows.getLastFocused(lastFocusedWindow => {
    chrome.tabs.query({ active: true, windowId: lastFocusedWindow.id }, ([tab]) => {
      const url = new URL(tab.url)
      const isPermittedSchema = permittedSchemas.includes(url.protocol)
      const isPermittedHost = url.host !== 'chrome.google.com'
      if (isPermittedSchema && isPermittedHost) {
        chrome.tabs.executeScript({ file: 'inject-iframe.js' })
      } else if (tab.url === quickJumpUrl) {
        // 已经处于 standalone mode
        portByTabId.get(tab.id).postMessage('open-quick-jump')
      } else {
        activateQuickJumpInStandaloneMode(tab => {
          ensurePortReady(tab, port => {
            port.postMessage('open-quick-jump')
          })
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

chrome.runtime.onConnect.addListener(port => {
  const tabId = port.sender.tab.id
  portByTabId.set(tabId, port)
  port.onDisconnect.addListener(() => {
    portByTabId.delete(tabId)
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

function handleQueryItems(request, sender, sendResponse) {
  let readyCount = 0
  function tryComplete() {
    if (readyCount === 3) {
      sendResponse(items)
    }
  }

  const items = []

  chrome.bookmarks.getTree(tree => {
    /** @type {Item[]}*/
    const bookmarkItems = []
    traverse([], tree[0].children)
    items.push(...bookmarkItems)

    readyCount++
    tryComplete()

    function traverse(prefix, array) {
      for (const mark of array) {
        if (Array.isArray(mark.children)) {
          traverse(prefix.concat([mark.title]), mark.children)
        } else {
          bookmarkItems.push({
            type: 'bookmark',
            itemKey: `bookmark-${mark.id}`,
            path: prefix,
            title: mark.title,
            url: mark.url,
          })
        }
      }
    }
  })

  chrome.tabs.query({}, tabs => {
    /** @type {Item[]} */
    for (const tab of tabs) {
      items.push({
        type: 'tab',
        itemKey: `tab-${tab.id}`,
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
      })
    }
    readyCount++
    tryComplete()
  })

  chrome.history.search(
    {
      text: '',
      endTime: new Date().valueOf(),
      startTime: new Date().valueOf() - 7 * 86400e3,
      maxResults: 100,
    },
    historyEntries => {
      for (const entry of historyEntries) {
        items.push({
          type: 'history',
          itemKey: `history-${entry.id}`,
          url: entry.url,
          title: entry.title,
          lastVisitTime: entry.lastVisitTime,
        })
      }
      readyCount++
      tryComplete()
    },
  )

  // 返回 true 表示我们将会异步地调用 `sendResponse`
  return true
}

function handleJump(request) {
  const { item } = request
  if (item.type === 'tab') {
    chrome.tabs.update(item.id, { active: true })
    chrome.windows.update(item.windowId, { focused: true })
  } else {
    chrome.tabs.create({ url: item.url, active: true })
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'query-items') {
    return handleQueryItems(request, sender, sendResponse)
  } else if (request.type === 'jump') {
    return handleJump(request, sender, sendResponse)
  }
})
