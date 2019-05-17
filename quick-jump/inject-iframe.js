function main() {
  const IFRAME_DATA_KEY = 'chrome_extension_quick_jump_iframe'

  function ensureIframeInjected(callback) {
    let iframe = document.querySelector(`iframe[data-${IFRAME_DATA_KEY}]`)
    if (iframe == null) {
      iframe = document.createElement('iframe')
      const iframeStyle =
        'position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 99999; width: 100%; height: 100%; border: none;'
      iframe.setAttribute('style', iframeStyle)
      iframe.dataset[IFRAME_DATA_KEY] = ''
      iframe.src = chrome.runtime.getURL('/quick-jump.html')
      iframe.style.display = 'none'
      document.body.append(iframe)

      window.addEventListener('message', msg => {
        if (msg.data === 'hide-quick-jump-iframe') {
          iframe.style.display = 'none'
        }
      })

      // 第一次加载 quick-jump-iframe 时，需要等待 iframe 内组件加载完成
      function waitForQuickJumpComponentReady(msg) {
        if (msg.data === 'ready-for-quick-jump') {
          callback(iframe)
          window.removeEventListener('message', waitForQuickJumpComponentReady)
        }
      }

      window.addEventListener('message', waitForQuickJumpComponentReady)
    } else {
      Promise.resolve(iframe).then(callback)
    }
  }

  ensureIframeInjected(iframe => {
    iframe.style.display = 'block'
    iframe.contentWindow.postMessage('open-quick-jump', '*')
  })
}

main()
