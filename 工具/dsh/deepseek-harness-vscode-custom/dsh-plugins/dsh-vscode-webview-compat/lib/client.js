// Consolidated client entry: one DSH plugin package activates all three features.
// The feature module ids remain stable because the VS Code host authenticates each
// message source independently; Cordis exposes only the unified package row.
(function () {
function createClipboardFeature(require) {

  var module = { exports: {} }
  var exports = module.exports

  var PLUGIN_VERSION = '0.3.0'
  // 父级 webview（VS Code 扩展）的身份标记：消息 source 字段。
  var HOST_ID = 'dsh-vscode-host'
  var SELF_ID = 'dsh-webview-clipboard'
  var HELLO_INTERVAL_MS = 400
  var HELLO_MAX_TRIES = 25
  var COPY_TIMEOUT_MS = 4000
  var TOKEN_MAX_LENGTH = 64
  // 与扩展宿主侧保持一致：单次转交文本上限 4 MiB。
  var TEXT_MAX_LENGTH = 4 * 1024 * 1024

  var acked = false
  var helloTimer = null
  var helloTries = 0
  var pendingCopy = {}
  var writePatch = null // {target, key, original}

  /** 是否被宿主内嵌（独立浏览器里 parent === self）。 */
  function inIframe() {
    try { return window.parent !== window } catch (e) { return false }
  }

  function isMac() {
    var ua = navigator.userAgent || ''
    if (/Macintosh|Mac OS X/i.test(ua)) return true
    if (typeof navigator.platform === 'string' && /Mac/i.test(navigator.platform)) return true
    try {
      if (navigator.userAgentData && navigator.userAgentData.platform === 'macOS') return true
    } catch (e) { /* ignore */ }
    return false
  }

  function inElectron() {
    return /Electron\//.test(navigator.userAgent || '')
  }

  /** macOS 快捷键兼容层只在宿主启用了剪贴板功能后生效。 */
  function enabled() {
    return inIframe() && isMac() && inElectron()
  }

  /** 向父级（webview）发消息：附带自身身份标记。 */
  function postToHost(payload) {
    payload.source = SELF_ID
    payload.version = PLUGIN_VERSION
    try {
      window.parent.postMessage(payload, '*')
    } catch (e) { /* 父级不可达：静默失败，行为回落到原生实现 */ }
  }

  function stopHello() {
    if (helloTimer !== null && typeof window.clearInterval === 'function') {
      window.clearInterval(helloTimer)
    }
    helloTimer = null
  }

  /** 周期性向宿主打招呼，直到拿到 ack（插件可能在 webview 就绪前后任意时刻加载）。 */
  function startHello() {
    if (!inIframe() || acked) return
    postToHost({ type: 'hello' })
    helloTries += 1
    if (helloTries >= HELLO_MAX_TRIES) return
    if (typeof window.setInterval !== 'function') return
    helloTimer = window.setInterval(function () {
      if (acked || helloTries >= HELLO_MAX_TRIES) { stopHello(); return }
      helloTries += 1
      postToHost({ type: 'hello' })
    }, HELLO_INTERVAL_MS)
  }

  function nextToken() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  /** 结束一次待回执的复制：ok=true 时 resolve，否则 reject。 */
  function settleCopy(token, ok) {
    var entry = pendingCopy[token]
    if (!entry) return
    delete pendingCopy[token]
    if (entry.timer !== null && typeof window.clearTimeout === 'function') {
      window.clearTimeout(entry.timer)
    }
    if (ok) {
      entry.resolve()
    } else {
      var err = new Error('clipboard write was not completed by the host')
      err.code = 'DSH_CLIPBOARD_DENIED'
      entry.reject(err)
    }
  }

  /** 经宿主写入剪贴板；返回 Promise<void>。 */
  function relayWriteText(text) {
    return new Promise(function (resolve, reject) {
      var token = nextToken()
      var entry = { resolve: resolve, reject: reject, timer: null }
      if (typeof window.setTimeout === 'function') {
        entry.timer = window.setTimeout(function () {
          settleCopy(token, false)
        }, COPY_TIMEOUT_MS)
      }
      pendingCopy[token] = entry
      postToHost({ type: 'copy', token: token, text: text })
    })
  }

  /**
   * 包裹 navigator.clipboard.writeText：握手后改走宿主中继；宿主通道失败时回落
   * 原生实现（独立浏览器里原生实现本来就能用，回落可避免中继异常放大故障面）。
   */
  function installWritePatch() {
    if (writePatch !== null) return
    try {
      var clipboard = navigator.clipboard
      if (!clipboard || typeof clipboard.writeText !== 'function') return
      var original = clipboard.writeText
      var patched = function (text) {
        if (!acked) return original.call(clipboard, text)
        var value = String(text)
        return relayWriteText(value).catch(function (err) {
          // 宿主通道不可用（旧版扩展 / 超时 / 明确拒绝）：回落原生实现。
          return original.call(clipboard, text).catch(function () {
            throw err
          })
        })
      }
      try {
        clipboard.writeText = patched
        writePatch = { target: clipboard, key: 'writeText', original: original }
      } catch (e) {
        // 实例属性不可写时，尝试改原型（Chromium 上 writeText 通常在 Clipboard.prototype）。
        var proto = Object.getPrototypeOf(clipboard)
        if (proto && typeof proto.writeText === 'function') {
          proto.writeText = patched
          writePatch = { target: proto, key: 'writeText', original: original }
        }
      }
    } catch (e) { /* 页面不允许改写：放弃，保持原生行为 */ }
  }

  function removeWritePatch() {
    if (writePatch === null) return
    try { writePatch.target[writePatch.key] = writePatch.original } catch (e) { /* ignore */ }
    writePatch = null
  }

  function onHostMessage(event) {
    if (event.source !== window.parent) return
    var data = event.data
    if (!data || typeof data !== 'object' || data.source !== HOST_ID) return
    if (data.type === 'ack') {
      // 老宿主不带 clipboard 字段：视为支持（v1.1.1 起才有该中继）。
      if (data.clipboard === false) {
        acked = false
        stopHello()
        removeWritePatch()
        return
      }
      acked = true
      stopHello()
      installWritePatch()
      return
    }
    if (data.type === 'clipboard-result' && typeof data.token === 'string') {
      settleCopy(data.token.slice(0, TOKEN_MAX_LENGTH), data.ok === true)
    }
  }

  /** 事件目标是否为可编辑元素（paste 只对它们有意义）。 */
  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false
    var tag = el.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT') return true
    return el.isContentEditable === true
  }

  function onKeyDown(e) {
    if (e.defaultPrevented) return                 // 页面自身已处理，尊重之
    if (!enabled() || !acked) return
    if (e.isComposing || e.keyCode === 229) return // IME 组合中不干预
    var mod = e.metaKey || e.ctrlKey
    if (!mod || e.altKey || e.shiftKey) return     // 仅裸 ⌘/Ctrl + 字母
    var lower = String(e.key || '').toLowerCase()
    var cmd = null
    if (lower === 'v') cmd = 'paste'
    else if (lower === 'c') cmd = 'copy'
    else if (lower === 'x') cmd = 'cut'
    if (!cmd) return
    if (cmd === 'paste' && !isEditable(e.target)) return
    e.preventDefault()
    try {
      var ok = document.execCommand(cmd)
      if (!ok) console.warn('[dsh-webview-clipboard] execCommand("' + cmd + '") returned false')
    } catch (err) {
      console.warn('[dsh-webview-clipboard] execCommand("' + cmd + '") failed:', err)
    }
  }

  function apply(ctx) {
    function arm() {
      window.addEventListener('keydown', onKeyDown, false)
      window.addEventListener('message', onHostMessage, false)
      startHello()
    }
    function disarm() {
      window.removeEventListener('keydown', onKeyDown, false)
      window.removeEventListener('message', onHostMessage, false)
      stopHello()
      removeWritePatch()
      for (var token in pendingCopy) {
        if (Object.prototype.hasOwnProperty.call(pendingCopy, token)) {
          if (pendingCopy[token].timer !== null && typeof window.clearTimeout === 'function') {
            window.clearTimeout(pendingCopy[token].timer)
          }
          pendingCopy[token].reject(new Error('clipboard plugin disposed'))
        }
      }
      pendingCopy = {}
    }
    if (ctx && typeof ctx.effect === 'function') ctx.effect(function () { arm(); return disarm })
    else arm()
    // 供排障使用：控制台可查 __dshWebviewClipboard
    window.__dshWebviewClipboard = {
      version: PLUGIN_VERSION,
      enabled: enabled(),
      mac: isMac(),
      electron: inElectron(),
      relay: function () { return acked }
    }
  }

  exports.apply = apply
  exports.inject = []
  return module.exports

}

function createFileLinksFeature(require) {

  var module = { exports: {} }
  var exports = module.exports

  var PLUGIN_VERSION = '0.1.0'
  // 父级 webview（VS Code 扩展）的身份标记：iframe name 属性 + 消息 source 字段。
  var HOST_ID = 'dsh-vscode-host'
  var SELF_ID = 'dsh-vscode-file-links'
  var HELLO_INTERVAL_MS = 400
  var HELLO_MAX_TRIES = 25
  var REVEAL_TIMEOUT_MS = 2500
  var PATH_MAX_LENGTH = 4096
  // 形如 `_fileLink_<hash>` 的 CSS Modules 类名：哈希后缀随版本变化，
  // 因此按 token 里的局部名匹配，不绑定完整类名。
  var FILE_LINK_CLASS = 'fileLink'

  var acked = false
  var replaying = false
  var helloTimer = null
  var helloTries = 0
  var pending = {}

  /** 是否被宿主内嵌（独立浏览器里 parent === self）。 */
  function inIframe() {
    try { return window.parent !== window } catch (e) { return false }
  }

  /** 父级是否为 VS Code 扩展的 webview（iframe name 标记，仅用于判断要不要打招呼）。 */
  function hostHinted() {
    try { return window.name === HOST_ID } catch (e) { return false }
  }

  /** 向父级（webview）发消息：附带自身身份标记。 */
  function postToHost(payload) {
    payload.source = SELF_ID
    payload.version = PLUGIN_VERSION
    try {
      // 目标 origin 无法从 iframe 内可靠得知（跨源），固定用户点击产生的路径本身
      // 也不敏感；宿主侧按 event.source + event.origin 双重校验，只认自己的 iframe。
      window.parent.postMessage(payload, '*')
    } catch (e) { /* 父级不可达：静默失败，行为回落到 DSH 自身 */ }
  }

  /** 停止握手重试。 */
  function stopHello() {
    if (helloTimer !== null) {
      window.clearInterval(helloTimer)
      helloTimer = null
    }
  }

  /** 周期性向宿主打招呼，直到拿到 ack（插件可能在 webview 就绪前后任意时刻加载）。 */
  function startHello() {
    if (!inIframe() || acked || helloTimer !== null) return
    postToHost({ type: 'hello' })
    helloTries += 1
    if (helloTries >= HELLO_MAX_TRIES) return
    helloTimer = window.setInterval(function () {
      if (acked || helloTries >= HELLO_MAX_TRIES) { stopHello(); return }
      helloTries += 1
      postToHost({ type: 'hello' })
    }, HELLO_INTERVAL_MS)
  }

  /** 事件目标是否为 DSH 渲染的文件链接按钮（含点击落在内部图标/文字上的情形）。 */
  function fileLinkButtonOf(node) {
    if (!node || typeof node.closest !== 'function') return null
    var button = node.closest('button')
    if (!button) return null
    var cls = button.getAttribute('class') || ''
    var parts = cls.split(/\s+/)
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(FILE_LINK_CLASS) >= 0) return button
    }
    return null
  }

  /** 友好的本地路径形状检查：排除 URL、多行文本、超长字符串。 */
  function looksLikePath(value) {
    if (typeof value !== 'string') return false
    var v = value.trim()
    if (v.length === 0 || v.length > PATH_MAX_LENGTH) return false
    if (v.indexOf('\n') >= 0 || v.indexOf('\r') >= 0 || v.indexOf('\u0000') >= 0) return false
    // 带 scheme 的 URL（http://、data: 等）不是本地路径；Windows 盘符 `C:\` 不受影响。
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return false
    return true
  }

  /**
   * 取出链接目标路径：DSH 把路径写在 title 上；带图片预览的链接没有 title，
   * 退回到链接文字（模型书写的 Markdown label，通常就是同样的相对路径）。
   */
  function pathOfButton(button) {
    var title = button.getAttribute('title')
    if (typeof title === 'string' && looksLikePath(title)) return title.trim()
    var text = button.textContent || ''
    if (looksLikePath(text)) return text.trim()
    return ''
  }

  function nextToken() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  /**
   * 回放原始点击：宿主不能处理（不在工作区内 / 面板未接管）时，让 DSH 自己把文件
   * 打开在 DSH 侧边栏，保持既有行为。click() 是同步派发，用 replaying 标记避免
   * 再次被本插件捕获。
   */
  function replayClick(button) {
    if (!button || typeof button.click !== 'function') return
    replaying = true
    try {
      button.click()
    } catch (e) { /* 按钮已卸载等情况：忽略 */ }
    replaying = false
  }

  function requestReveal(button, path) {
    var token = nextToken()
    pending[token] = {
      el: button,
      timer: window.setTimeout(function () {
        delete pending[token]
        // 宿主没回执（面板关闭 / 扩展未升级）：回放点击，行为退回 DSH 自身。
        replayClick(button)
      }, REVEAL_TIMEOUT_MS)
    }
    postToHost({ type: 'reveal', token: token, path: path })
  }

  function onClickCapture(event) {
    if (!acked || replaying) return
    if (event.defaultPrevented) return
    // 修饰键点击 = 用户明确要求走 DSH 自身行为（在 DSH 侧边栏打开）。
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    var button = fileLinkButtonOf(event.target)
    if (!button) return
    var path = pathOfButton(button)
    if (path === '') return
    // 先吞掉这次点击（阻止 React 的委托 handler 调用 DSH 的 openFile），
    // 再由宿主回执决定是否回放；其它 DOM 监听器不受影响。
    event.preventDefault()
    event.stopPropagation()
    requestReveal(button, path)
  }

  function onHostMessage(event) {
    if (event.source !== window.parent) return
    var data = event.data
    if (!data || typeof data !== 'object' || data.source !== HOST_ID) return
    if (data.type === 'ack') {
      // 宿主明确声明「已启用接管」；fileLinks 缺省视为启用（老宿主不带该字段）。
      if (data.fileLinks === false) { stopHello(); return }
      acked = true
      stopHello()
      return
    }
    if (data.type === 'reveal-result' && typeof data.token === 'string') {
      var entry = pending[data.token]
      if (!entry) return
      delete pending[data.token]
      window.clearTimeout(entry.timer)
      if (data.ok !== true) replayClick(entry.el)
    }
  }

  function apply(ctx) {
    function arm() {
      document.addEventListener('click', onClickCapture, true)
      window.addEventListener('message', onHostMessage, false)
      startHello()
    }
    function disarm() {
      document.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('message', onHostMessage, false)
      stopHello()
      for (var token in pending) {
        if (Object.prototype.hasOwnProperty.call(pending, token)) {
          window.clearTimeout(pending[token].timer)
        }
      }
      pending = {}
    }
    if (ctx && typeof ctx.effect === 'function') ctx.effect(function () { arm(); return disarm })
    else arm()
    // 供排障使用：控制台可查 __dshVscodeFileLinks.acked()
    window.__dshVscodeFileLinks = {
      version: PLUGIN_VERSION,
      hostHint: hostHinted(),
      acked: function () { return acked }
    }
  }

  exports.apply = apply
  exports.inject = []
  return module.exports

}

function createOpenExternalFeature(require) {

  var module = { exports: {} }
  var exports = module.exports

  var PLUGIN_VERSION = '0.1.0'
  var HOST_ID = 'dsh-vscode-host'
  var SELF_ID = 'dsh-vscode-open-external'
  var HELLO_INTERVAL_MS = 400
  var HELLO_MAX_TRIES = 25
  var URL_MAX_LENGTH = 8192
  var pendingPopup = null

  var acked = false
  var helloTimer = null
  var helloTries = 0
  var originalOpen = null
  var patched = false

  /** 是否被宿主内嵌（独立浏览器里 parent === self）。 */
  function inIframe() {
    try { return window.parent !== window } catch (e) { return false }
  }

  /** 向父级（webview）发消息：附带自身身份标记。 */
  function postToHost(payload) {
    payload.source = SELF_ID
    payload.version = PLUGIN_VERSION
    try {
      window.parent.postMessage(payload, '*')
    } catch (e) { /* 父级不可达：静默失败 */ }
  }

  function stopHello() {
    if (helloTimer !== null) {
      window.clearInterval(helloTimer)
      helloTimer = null
    }
  }

  function startHello() {
    if (!inIframe() || acked || helloTimer !== null) return
    postToHost({ type: 'hello' })
    helloTries += 1
    if (helloTries >= HELLO_MAX_TRIES) return
    helloTimer = window.setInterval(function () {
      if (acked || helloTries >= HELLO_MAX_TRIES) { stopHello(); return }
      helloTries += 1
      postToHost({ type: 'hello' })
    }, HELLO_INTERVAL_MS)
  }

  /** 把链接交给宿主（系统浏览器）。非 http/https 或超长链接返回 false。 */
  function handOff(url) {
    if (typeof url !== 'string') return false
    var u = url.trim()
    if (u.length === 0 || u.length > URL_MAX_LENGTH) return false
    if (!/^https?:\/\//i.test(u)) return false
    postToHost({ type: 'open', url: u })
    return true
  }

  /**
   * DSH 登录流程先 window.open('about:blank') 预开页，拿到授权链接后再
   * popup.location.replace(url)。这里返回可导航的桩对象，把跳转目标转交宿主；
   * popup.closed / close() / opener 等常见访问保持可用，避免 DSH 逻辑报错。
   */
  function makePopupStub() {
    var stub = {
      closed: false,
      opener: null,
      focus: function () {},
      blur: function () {},
      postMessage: function () {},
      close: function () { stub.closed = true }
    }
    function navigate(target) {
      if (handOff(target)) pendingPopup = null
    }
    stub.location = {
      replace: navigate,
      assign: navigate,
      reload: function () {},
      toString: function () { return 'about:blank' },
      get href() { return 'about:blank' },
      set href(target) { navigate(target) },
      get origin() { return 'null' }
    }
    pendingPopup = stub
    return stub
  }

  function isAboutBlank(value) {
    return value === '' || value === 'about:blank'
  }

  function patchedOpen(url, target, features) {
    try {
      if (acked) {
        var raw = typeof url === 'string' ? url : ''
        if (isAboutBlank(raw)) {
          return makePopupStub()
        }
        if (handOff(raw)) return null
      }
    } catch (e) { /* 任何异常都回退原生行为 */ }
    return originalOpen.apply(window, arguments)
  }

  function installPatch() {
    if (patched) return
    originalOpen = window.open
    try {
      window.open = patchedOpen
      patched = true
    } catch (e) {
      originalOpen = null
    }
  }

  function removePatch() {
    if (!patched) return
    try { window.open = originalOpen } catch (e) { /* 页面正在卸载：忽略 */ }
    patched = false
    originalOpen = null
    pendingPopup = null
  }

  function onHostMessage(event) {
    if (event.source !== window.parent) return
    var data = event.data
    if (!data || typeof data !== 'object' || data.source !== HOST_ID) return
    if (data.type === 'ack' && data.openExternal === true) {
      acked = true
      stopHello()
      installPatch()
    }
  }

  function apply(ctx) {
    function arm() {
      window.addEventListener('message', onHostMessage, false)
      startHello()
    }
    function disarm() {
      window.removeEventListener('message', onHostMessage, false)
      stopHello()
      removePatch()
    }
    if (ctx && typeof ctx.effect === 'function') ctx.effect(function () { arm(); return disarm })
    else arm()
    // 供排障使用：控制台可查 __dshVscodeOpenExternal.acked()
    window.__dshVscodeOpenExternal = {
      version: PLUGIN_VERSION,
      acked: function () { return acked }
    }
  }

  exports.apply = apply
  exports.inject = []
  return module.exports

}
  window.__ModuleLoader__.load({ id: 'dsh-webview-clipboard', factory: createClipboardFeature });
  window.__ModuleLoader__.load({ id: 'dsh-vscode-file-links', factory: createFileLinksFeature });
  window.__ModuleLoader__.load({ id: 'dsh-vscode-open-external', factory: createOpenExternalFeature });
  window.__ModuleLoader__.load({
    id: 'dsh-vscode-webview-compat',
    factory: (require) => {
      var module = { exports: {} };
      var exports = module.exports;
      var features = [
        createClipboardFeature(require),
        createFileLinksFeature(require),
        createOpenExternalFeature(require)
      ];
      function apply(ctx) {
        for (var i = 0; i < features.length; i += 1) features[i].apply(ctx);
      }
      exports.apply = apply;
      exports.inject = [];
      return module.exports;
    }
  });
})();
