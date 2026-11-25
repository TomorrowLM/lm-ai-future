// DSH Cordis client plugin: exposes a reusable request API and reference service,
// receives requests from VS Code integrations, and handles file drops in composer.
window.__ModuleLoader__.load({ id: 'dsh-vscode-bridge', factory: (require) => {
  var module = { exports: {} }
  var exports = module.exports
  var React = require('react')

  var HOST_ID = 'dsh-vscode-host'
  var PLUGIN_ID = 'dsh-vscode-bridge'
  var REFERENCE_SOURCE = 'dsh-vscode-bridge'
  var MAX_REFERENCES = 100
  var MAX_PATH_LENGTH = 4096
  var VS_CODE_FILE_PATHS_MIME = 'CodeFiles'
  var VS_CODE_RESOURCE_URLS_MIME = 'ResourceURLs'
  var handlers = new Map()
  var handledRequests = new Map()
  var mountedComposerSessions = []

  function handlerKey(pluginId, method) {
    return pluginId + ':' + method
  }

  function validIdentifier(value) {
    return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
  }

  function registerHandler(pluginId, method, handler) {
    if (!validIdentifier(pluginId) || !validIdentifier(method) || typeof handler !== 'function') {
      throw new TypeError('invalid DSH VS Code bridge handler')
    }
    var key = handlerKey(pluginId, method)
    if (handlers.has(key)) throw new Error('DSH bridge handler already registered: ' + key)
    handlers.set(key, handler)
    return function () {
      if (handlers.get(key) === handler) handlers.delete(key)
    }
  }

  function basenameOf(path) {
    var index = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
    return index === -1 ? path : path.slice(index + 1)
  }

  function matchDroppedFile(files, path) {
    var name = basenameOf(path).toLowerCase()
    var match = null
    for (var i = 0; i < files.length; i++) {
      if (String(files[i] && files[i].name || '').toLowerCase() !== name) continue
      if (match !== null) return null
      match = files[i]
    }
    return match
  }

  function rangeSuffix(startLine, endLine) {
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) return ''
    return ':' + startLine + (endLine > startLine ? '-' + endLine : '')
  }

  // DSH reference chips expand to clipboard text in draft but occupy one detect-text unit.
  function detectDraftText(state) {
    if (!state || typeof state.draft !== 'string') return null
    var text = state.draft
    var occurrences = Array.isArray(state.occurrences) ? state.occurrences : []
    var previousEnd = 0
    for (var i = 0; i < occurrences.length; i++) {
      var item = occurrences[i]
      var offset = item && item.offset
      var length = item && item.length
      var clipboardText = item && item.clipboardText
      if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < previousEnd || length < 1 ||
          offset + length > state.draft.length || typeof clipboardText !== 'string' ||
          clipboardText.length !== length || state.draft.slice(offset, offset + length) !== clipboardText) return null
      previousEnd = offset + length
    }
    for (var j = occurrences.length - 1; j >= 0; j--) {
      var occurrence = occurrences[j]
      text = text.slice(0, occurrence.offset) + '\uFFFC' + text.slice(occurrence.offset + occurrence.length)
    }
    return text
  }

  function validateReference(value) {
    if (!value || typeof value.filePath !== 'string') return null
    var filePath = value.filePath.trim()
    if (!filePath || filePath.length > MAX_PATH_LENGTH) return null
    var startLine = Number(value.startLine)
    var endLine = Number(value.endLine)
    if (value.startLine === undefined && value.endLine === undefined) {
      startLine = 0
      endLine = 0
    } else if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) {
      return null
    }
    return { filePath: filePath, startLine: startLine, endLine: endLine }
  }

  function insertReferences(ctx, sessionId, inputReferences) {
    if (!Array.isArray(inputReferences) || inputReferences.length === 0 || inputReferences.length > MAX_REFERENCES) {
      return { inserted: 0, total: Array.isArray(inputReferences) ? inputReferences.length : 0, failedIndex: 0 }
    }
    var actx = ctx.sessions.scope(sessionId)
    if (!actx) return { inserted: 0, total: inputReferences.length, failedIndex: 0 }
    var conversation = actx.get('conversation')
    if (!conversation || !conversation.input || typeof conversation.input.for !== 'function') {
      return { inserted: 0, total: inputReferences.length, failedIndex: 0 }
    }
    var input = conversation.input.for(actx)
    if (!input || typeof input.insertReference !== 'function' || !input.state) {
      return { inserted: 0, total: inputReferences.length, failedIndex: 0 }
    }

    var inserted = 0
    for (var i = 0; i < inputReferences.length; i++) {
      var item = validateReference(inputReferences[i])
      if (!item) return { inserted: inserted, total: inputReferences.length, failedIndex: i }
      var state = input.state.getSnapshot()
      var detectText = detectDraftText(state)
      if (!state || !Number.isInteger(state.draftRev) || detectText === null) {
        return { inserted: inserted, total: inputReferences.length, failedIndex: i }
      }
      var suffix = rangeSuffix(item.startLine, item.endLine)
      var ref = item.filePath + suffix
      var accepted = input.insertReference({
        source: REFERENCE_SOURCE,
        ref: ref,
        label: basenameOf(item.filePath) + suffix,
        clipboardText: ref
      }, {
        start: detectText.length,
        end: detectText.length,
        draftRev: state.draftRev
      })
      if (accepted !== true) return { inserted: inserted, total: inputReferences.length, failedIndex: i }
      inserted += 1
    }
    return { inserted: inserted, total: inputReferences.length, failedIndex: -1 }
  }

  function parseUriList(text) {
    return String(text || '').split(/\r?\n/).map(function (line) { return line.trim() })
      .filter(function (line) { return line && line.charAt(0) !== '#' })
  }

  function normalizePath(path) {
    if (/^[A-Za-z]:[\\/]/.test(path)) return path.charAt(0).toUpperCase() + ':' + path.slice(2).replace(/\//g, '\\')
    return path
  }

  function fileUriToPath(value) {
    if (typeof value !== 'string') return null
    var uri = value.trim()
    if (uri.indexOf('file://') === 0) {
      var path
      try { path = decodeURIComponent(uri.slice(7)) } catch (e) { path = uri.slice(7) }
      if (/^\/[A-Za-z]:[\\/]/.test(path)) path = path.slice(1)
      return normalizePath(path)
    }
    // VS Code remote URIs contain the remote authority followed by the server-side path.
    var remote = uri.match(/^vscode-remote:\/\/[^/]+(\/.*)$/i)
    if (remote) {
      var remotePath = remote[1]
      try { remotePath = decodeURIComponent(remotePath) } catch (e) { /* keep the original path */ }
      if (/^\/[A-Za-z]:[\\/]/.test(remotePath)) remotePath = remotePath.slice(1)
      return normalizePath(remotePath)
    }
    if (/^[A-Za-z]:[\\/]/.test(uri) || uri.charAt(0) === '/') return normalizePath(uri)
    return null
  }

  function extractUrisFromTree(text) {
    var result = []
    try { walk(JSON.parse(text)) } catch (e) { return result }
    function walk(value) {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) {
        value.forEach(walk)
        return
      }
      var uri = value.resource || value.resourceUri || value.uri
      if (typeof uri === 'string') result.push(uri)
      Object.keys(value).forEach(function (key) {
        if (key !== 'resource' && key !== 'resourceUri' && key !== 'uri') walk(value[key])
      })
    }
    return result
  }

  function parseVscodeFilePaths(text) {
    var value = String(text || '').trim()
    if (!value) return []
    try {
      var parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter(function (path) { return typeof path === 'string' && path.trim() })
      }
      return extractUrisFromTree(value)
    } catch (error) {
      return parseUriList(value)
    }
  }

  function getFileDropKind(event) {
    var transfer = event.dataTransfer
    if (!transfer) return 'none'
    var types = transfer.types || []
    if (Array.prototype.indexOf.call(types, 'text/uri-list') >= 0 ||
        Array.prototype.indexOf.call(types, 'application/vnd.code.tree') >= 0 ||
        Array.prototype.indexOf.call(types, VS_CODE_FILE_PATHS_MIME) >= 0 ||
        Array.prototype.indexOf.call(types, VS_CODE_RESOURCE_URLS_MIME) >= 0) return 'uris'
    for (var typeIndex = 0; typeIndex < types.length; typeIndex++) {
      // VS Code adds the tree view id to this MIME type, for example
      // application/vnd.code.tree.workbench.explorer.fileview.
      if (typeof types[typeIndex] === 'string' && types[typeIndex].indexOf('application/vnd.code.tree.') === 0) return 'uris'
    }
    if (Array.prototype.indexOf.call(types, 'Files') >= 0) return 'files'
    var items = transfer.items || []
    for (var i = 0; i < items.length; i++) if (items[i] && items[i].kind === 'file') return 'files'
    return 'none'
  }

  function getTreeDropData(transfer) {
    var types = transfer.types || []
    for (var i = 0; i < types.length; i++) {
      var type = types[i]
      if (type !== 'application/vnd.code.tree' &&
          (typeof type !== 'string' || type.indexOf('application/vnd.code.tree.') !== 0)) continue
      try {
        var data = transfer.getData(type)
        if (data) return data
      } catch (error) {
        console.warn('[dsh-vscode-bridge] unable to read VS Code tree payload:', error)
      }
    }
    return ''
  }

  async function uploadFile(sessionId, file) {
    var response = await fetch('/api/dsh-vscode-drop', {
      method: 'POST',
      headers: {
        'x-file-name': encodeURIComponent(file.name || 'upload.bin'),
        'x-session-id': sessionId
      },
      body: file
    })
    if (!response.ok) throw new Error('upload HTTP ' + response.status)
    var result = await response.json()
    if (typeof result.path !== 'string') throw new Error('upload response has no path')
    return result.path
  }

  async function checkAccessiblePaths(sessionId, paths) {
    var response = await fetch('/api/dsh-vscode-path-check', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({ paths: paths })
    })
    if (!response.ok) throw new Error('path check HTTP ' + response.status)
    var result = await response.json()
    if (!Array.isArray(result.accessible) || result.accessible.length !== paths.length) {
      throw new Error('path check response is invalid')
    }
    return result.accessible
  }

  async function handleDrop(ctx, sessionId, transfer) {
    var references = []
    var droppedCount = Number.isInteger(transfer.droppedCount) ? transfer.droppedCount : 0
    if (transfer.kind === 'files') {
      droppedCount = Math.max(droppedCount, transfer.files.length)
      for (var j = 0; j < Math.min(transfer.files.length, MAX_REFERENCES); j++) {
        try {
          references.push({ filePath: await uploadFile(sessionId, transfer.files[j]) })
        } catch (error) {
          console.error('[dsh-vscode-bridge] dropped file upload failed:', error)
        }
      }
    } else {
      var uris = transfer.uris || []
      if (uris.length === 0 && transfer.treeData) uris = extractUrisFromTree(transfer.treeData)
      droppedCount = Math.max(droppedCount, uris.length)
      var paths = uris.slice(0, MAX_REFERENCES).map(fileUriToPath).filter(Boolean)
      if (paths.length > 0) {
        var droppedFiles = transfer.files || []
        var pathNameCounts = new Map()
        var fileNameCounts = new Map()
        paths.forEach(function (path) {
          var name = basenameOf(path).toLowerCase()
          pathNameCounts.set(name, (pathNameCounts.get(name) || 0) + 1)
        })
        droppedFiles.forEach(function (file) {
          var name = String(file && file.name || '').toLowerCase()
          fileNameCounts.set(name, (fileNameCounts.get(name) || 0) + 1)
        })

        var accessible
        try {
          accessible = await checkAccessiblePaths(sessionId, paths)
        } catch (error) {
          // If the DSH server cannot check the URI, never assume a client path exists remotely.
          console.error('[dsh-vscode-bridge] dropped path check failed:', error)
          accessible = paths.map(function () { return false })
        }
        for (var k = 0; k < paths.length; k++) {
          if (accessible[k]) {
            references.push({ filePath: paths[k] })
            continue
          }
          var name = basenameOf(paths[k]).toLowerCase()
          if (pathNameCounts.get(name) !== 1 || fileNameCounts.get(name) !== 1) {
            console.warn('[dsh-vscode-bridge] ambiguous dropped-file mapping; skipping upload fallback:', paths[k])
            continue
          }
          var file = matchDroppedFile(droppedFiles, paths[k])
          if (!file) {
            console.warn('[dsh-vscode-bridge] dropped path is not accessible from DSH and no file data is available:', paths[k])
            continue
          }
          try {
            references.push({ filePath: await uploadFile(sessionId, file) })
          } catch (error) {
            console.error('[dsh-vscode-bridge] inaccessible dropped file upload failed:', error)
          }
        }
      }
    }
    droppedCount = Math.max(droppedCount, references.length)
    if (references.length === 0) {
      return { inserted: 0, total: 0, failedIndex: 0, dropped: droppedCount, skipped: droppedCount }
    }

    var result = insertReferences(ctx, sessionId, references)
    if (result.inserted !== references.length) console.warn('[dsh-vscode-bridge] partial file drop:', result)
    var skipped = Math.max(0, droppedCount - references.length) + Math.max(0, references.length - result.inserted)
    return Object.assign({}, result, { dropped: droppedCount, skipped: skipped })
  }

  function sendResponse(requestId, result, error) {
    try {
      window.parent.postMessage({
        source: PLUGIN_ID,
        type: 'plugin-response',
        requestId: requestId,
        ok: !error,
        result: result,
        error: error ? String(error.message || error).slice(0, 2000) : undefined
      }, '*')
    } catch (e) { /* the parent webview may already be closing */ }
  }

  function handleHostPluginMessage(event, ctx) {
    if (event.source !== window.parent) return
    var data = event.data
    if (!data || data.source !== HOST_ID || data.type !== 'plugin-request' ||
        typeof data.requestId !== 'string' || data.requestId.length > 128 ||
        !validIdentifier(data.pluginId) || !validIdentifier(data.method)) return
    if (handledRequests.has(data.requestId)) return
    handledRequests.set(data.requestId, true)
    if (handledRequests.size > 128) handledRequests.delete(handledRequests.keys().next().value)

    var handler = handlers.get(handlerKey(data.pluginId, data.method))
    if (!handler) {
      sendResponse(data.requestId, undefined, new Error('No DSH bridge handler for ' + data.pluginId + '.' + data.method))
      return
    }
    var mounted = mountedComposerSessions[mountedComposerSessions.length - 1]
    var sessionId = mounted && mounted.sessionId
    if (!sessionId) {
      sendResponse(data.requestId, undefined, new Error('DSH 当前没有可用的会话输入框，请先打开或新建一个对话。'))
      return
    }
    Promise.resolve(handler({ sessionId: sessionId, payload: data.payload, requestId: data.requestId }))
      .then(function (result) { sendResponse(data.requestId, result, null) })
      .catch(function (error) { sendResponse(data.requestId, undefined, error) })
  }

  function BridgeInput(props) {
    var ctx = props.ctx
    var dropNoticeState = React.useState('')
    var dropNotice = dropNoticeState[0]
    var setDropNotice = dropNoticeState[1]
    var dropNoticeTimer = React.useRef(null)

    function showDropNotice(result) {
      if (!result || result.skipped < 1) return
      var isChinese = /^zh/i.test(navigator.language || '')
      var text = isChinese
        ? `已添加 ${result.inserted}/${result.dropped} 个文件引用；${result.skipped} 项因不可读、名称重复或插入失败而跳过。`
        : `Added ${result.inserted}/${result.dropped} file references; skipped ${result.skipped} unreadable, ambiguous, or failed item(s).`
      setDropNotice(text)
      if (dropNoticeTimer.current) clearTimeout(dropNoticeTimer.current)
      dropNoticeTimer.current = setTimeout(function () { setDropNotice('') }, 6000)
    }

    React.useEffect(function () {
      return function () {
        if (dropNoticeTimer.current) clearTimeout(dropNoticeTimer.current)
      }
    }, [])

    React.useEffect(function () {
      if (typeof props.sessionId !== 'string' || !props.sessionId) return
      var mounted = { sessionId: props.sessionId }
      mountedComposerSessions.push(mounted)
      return function () {
        var index = mountedComposerSessions.indexOf(mounted)
        if (index >= 0) mountedComposerSessions.splice(index, 1)
      }
    }, [props.sessionId])

    React.useEffect(function () {
      function onDragEnter(event) {
        if (getFileDropKind(event) === 'none') return
        event.preventDefault()
        try { event.dataTransfer.dropEffect = 'copy' } catch (error) { /* the browser may expose a read-only transfer */ }
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
      }

      function onDrop(event) {
        var kind = getFileDropKind(event)
        if (kind === 'none') return
        event.preventDefault()
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

        var transfer = event.dataTransfer
        var uris = []
        var treeData = ''
        if (kind === 'uris') {
          var uriData = transfer.getData('text/uri-list')
          uris = parseUriList(uriData)
          if (uris.length === 0) uris = parseVscodeFilePaths(transfer.getData(VS_CODE_FILE_PATHS_MIME))
          if (uris.length === 0) uris = parseVscodeFilePaths(transfer.getData(VS_CODE_RESOURCE_URLS_MIME))
          treeData = getTreeDropData(transfer)
          if (uris.length === 0) uris = extractUrisFromTree(treeData)
        }
        // Snapshot during drop: Chromium clears DataTransfer.files after this event returns.
        var files = Array.prototype.slice.call(transfer.files || [])
        var droppedCount = kind === 'files' ? files.length : uris.length
        handleDrop(ctx, props.sessionId, { kind: kind, uris: uris, files: files, treeData: treeData, droppedCount: droppedCount })
          .then(showDropNotice)
          .catch(function (error) {
            console.error('[dsh-vscode-bridge] drop handler failed:', error)
            showDropNotice({ inserted: 0, dropped: Math.max(droppedCount, 1), skipped: Math.max(droppedCount, 1) })
          })
      }

      function onDragOver(event) {
        if (getFileDropKind(event) === 'none') return
        event.preventDefault()
        try { event.dataTransfer.dropEffect = 'copy' } catch (error) { /* the browser may expose a read-only transfer */ }
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
      }

      function onDragLeave(event) {
        if (getFileDropKind(event) === 'none') return
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
      }

      window.addEventListener('dragenter', onDragEnter, true)
      window.addEventListener('dragover', onDragOver, true)
      window.addEventListener('dragleave', onDragLeave, true)
      window.addEventListener('drop', onDrop, true)
      return function () {
        window.removeEventListener('dragenter', onDragEnter, true)
        window.removeEventListener('dragover', onDragOver, true)
        window.removeEventListener('dragleave', onDragLeave, true)
        window.removeEventListener('drop', onDrop, true)
      }
    }, [ctx, props.sessionId])
    if (!dropNotice) return null
    return React.createElement('div', {
      role: 'status',
      'aria-live': 'polite',
      style: {
        position: 'fixed',
        left: '50%',
        bottom: '88px',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        maxWidth: 'min(80vw, 560px)',
        padding: '10px 14px',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        background: 'rgba(35,35,35,0.96)',
        color: '#fff',
        fontSize: '13px',
        lineHeight: 1.45,
        boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
        pointerEvents: 'none'
      }
    }, dropNotice)
  }

  function apply(ctx) {
    var api = {
      registerHandler: registerHandler,
      insertReferences: function (options) {
        return insertReferences(ctx, options && options.sessionId, options && options.references)
      }
    }
    ctx.provide('dshVscodeBridge', api)
    ctx.effect(function () {
      return registerHandler(PLUGIN_ID, 'insertReferences', function (request) {
        var payload = request.payload || {}
        return api.insertReferences({ sessionId: request.sessionId, references: payload.references })
      })
    })
    ctx.effect(function () {
      function onMessage(event) { handleHostPluginMessage(event, ctx) }
      window.addEventListener('message', onMessage)
      return function () { window.removeEventListener('message', onMessage) }
    })

    ctx.effect(function () {
      return ctx.inputTriggers.registerSource({
        trigger: '@',
        name: REFERENCE_SOURCE,
        candidates: async function () { return [] },
        onPick: function () { return undefined },
        codec: {
          clipboardText: function (ref) { return ref },
          serialize: async function (ref) { return ref }
        }
      })
    })
    ctx.slots.inject('conversation.input.left', function () {
      return ctx.slots.register({
        name: 'conversation.input.left',
        id: 'dsh-vscode-bridge',
        order: 0,
        inject: function (sessionId) { return { ctx: ctx, sessionId: sessionId } }
      }, BridgeInput)
    })
  }

  exports.apply = apply
  exports.inject = ['slots', 'inputTriggers', 'sessions']
  return module.exports
} })
