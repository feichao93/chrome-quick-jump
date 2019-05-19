type Tab = chrome.tabs.Tab

/** 获取 QuickJumpApp 的运行模式 */
function getMode(): 'iframe' | 'standalone' {
  if (window.top !== window) {
    return 'iframe'
  } else {
    return 'standalone'
  }
}

/** 判断当前是否处于独立模式 */
export function isStandaloneMode() {
  return getMode() === 'standalone'
}

/** 异步获取浏览器的标签页信息 */
function requestTabsInfo(callback: (tabs: Tab[]) => void) {
  chrome.runtime.sendMessage({ type: 'request-for-tabs-info' }, (tabs: Tab[]) => {
    callback(tabs)
  })
}

/** 在 iframe 环境下，通知 window.parent 隐藏当前 iframe
 * 在 standalone 环境下，关闭当前标签页 */
export function hideContainer() {
  if (getMode() === 'iframe') {
    window.parent.postMessage('hide-quick-jump-iframe', '*')
  } else {
    window.close()
  }
}

/** 在 iframe 环境下，通知 window.parent 当前 QuickJumpApp 已准备好 */
export function signalReadyForQuickJump() {
  if (getMode() === 'iframe') {
    window.parent.postMessage('ready-for-quick-jump', '*')
  }
}

export function jumpTo(tab: Tab) {
  chrome.runtime.sendMessage({ type: 'jump-to-tab', tab })
}

/** 在 iframe 环境下，注册 open-quick-jump 事件的回调函数
 * 当用户按下 quick-jump 扩展的快捷键时，该事件将被触发 */
export function addOpenQuickJumpCallback(callback: (tabs: Tab[], initQuery: string) => void) {
  if (getMode() === 'iframe') {
    const listener = (msg: MessageEvent) => {
      // 来自于上层页面的消息
      if (msg.source === window.parent && msg.data === 'open-quick-jump') {
        chrome.storage.local.get('lastQuery', ({ lastQuery }) => {
          requestTabsInfo(tabs => {
            callback(tabs, lastQuery || '')
          })
        })
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  } else {
    chrome.storage.local.get('lastQuery', ({ lastQuery }) => {
      requestTabsInfo(tabs => {
        callback(tabs, lastQuery || '')
      })
    })
  }
}

export function setLastQuery(query: string) {
  chrome.storage.local.set({ lastQuery: query })
}
