export type Item = TabItem // | BookmarkItem | HistoryItem

export type TabItem = {
  type: 'tab'
  itemKey: string
  id: number
  windowId: number
  title: string
  url: string
  favIconUrl: string
}

// export type BookmarkItem = {
//   type: 'bookmark'
//   id: string | number
//   // TODO path?
//   title: string
//   url: string
//   favIconUrl: string
// }
//
// export type HistoryItem = {
//   type: 'history'
//   id: string | number
//   title: string
//   url: string
// }

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

/** 异步获取浏览器的标签页、历史记录、收藏夹信息 */
function queryItems(callback: (items: Item[]) => void) {
  chrome.runtime.sendMessage({ type: 'query-items' }, (items: Item[]) => {
    callback(items)
  })
}

/** 在 iframe 环境下，通知 window.parent 隐藏当前 iframe
 * 在 standalone 环境下，关闭当前标签页 */
export function hideContainer() {
  if (getMode() === 'iframe') {
    window.parent.postMessage('hide-quick-jump-iframe', '*')
  } else {
    if (process.env.NODE_ENV === 'production') {
      window.close()
    }
  }
}

/** 在 iframe 环境下，通知 window.parent 当前 QuickJumpApp 已准备好 */
export function signalReadyForQuickJump() {
  if (getMode() === 'iframe') {
    window.parent.postMessage('ready-for-quick-jump', '*')
  }
}

export function jumpTo(item: Item) {
  chrome.runtime.sendMessage({ type: 'jump', item })
}

/** 在 iframe 环境下，注册 open-quick-jump 事件的回调函数
 * 当用户按下 quick-jump 扩展的快捷键时，该事件将被触发 */
export function addOpenQuickJumpCallback(callback: (items: Item[], initQuery: string) => void) {
  if (getMode() === 'iframe') {
    const listener = (msg: MessageEvent) => {
      // 来自于上层页面的消息
      if (msg.source === window.parent && msg.data === 'open-quick-jump') {
        chrome.storage.local.get('lastQuery', ({ lastQuery }) => {
          queryItems(items => {
            callback(items, lastQuery || '')
          })
        })
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  } else {
    const port = chrome.runtime.connect({ name: 'open-quick-jump' })
    port.onMessage.addListener(msg => {
      if (msg === 'open-quick-jump') {
        chrome.storage.local.get('lastQuery', ({ lastQuery }) => {
          queryItems(items => {
            callback(items, lastQuery || '')
          })
        })
      }
    })
  }
}

export function setLastQuery(query: string) {
  chrome.storage.local.set({ lastQuery: query })
}
