import { constants as fsConstants } from 'node:fs'
import { access, lstat, mkdir, realpath, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'

export const name = 'dsh-vscode-bridge'
export const inject = ['connection', 'sessions']

const MAX_BYTES = 24 * 1024 * 1024
const MAX_CHECK_PATHS = 100
const MAX_CHECK_BODY_BYTES = 512 * 1024

function safeSessionId(value) {
  const cleaned = String(value || '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 80)
  return cleaned || 'anonymous'
}

function safeFileName(value) {
  const cleaned = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '')
  const parts = cleaned.split(/[\\/]/).filter((part) => part && part !== '.' && part !== '..')
  const joined = parts.join('_').replace(/^\.+/, '').trim()
  const extIndex = joined.lastIndexOf('.')
  const ext = extIndex > 0 && extIndex < joined.length - 1 ? joined.slice(extIndex) : ''
  const stem = ext ? joined.slice(0, extIndex) : joined
  const out = `${stem.slice(0, 100)}${ext.slice(0, 20)}`
  return out && !/^\.+$/.test(out) ? out : 'upload.bin'
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })
}

function errorStatus(error, fallback = 500) {
  return Number.isInteger(error && error.statusCode) ? error.statusCode : fallback
}

async function readRequestBody(request, limit) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw Object.assign(new Error('payload too large'), { statusCode: 413 })
  }

  const reader = request.body && request.body.getReader()
  if (!reader) return Buffer.alloc(0)

  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const data = Buffer.from(value)
      length += data.length
      if (length > limit) {
        try { await reader.cancel() } catch { /* the request may already be closing */ }
        throw Object.assign(new Error('payload too large'), { statusCode: 413 })
      }
      chunks.push(data)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

function isInsideWorkspace(root, target) {
  const pathFromRoot = relative(root, target)
  return pathFromRoot !== '' && pathFromRoot !== '..' &&
    !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot)
}

export function apply(ctx) {
  const storageDirFor = async (sessionId) => {
    const session = ctx.sessions.get(sessionId)
    const cwd = session && session.header && session.header.cwd
    if (typeof cwd !== 'string' || cwd.trim() === '') {
      throw Object.assign(new Error('unknown DSH session'), { statusCode: 404 })
    }

    const workspaceRoot = await realpath(cwd)
    const dropRoot = join(workspaceRoot, '.dsh-drop')
    try {
      await mkdir(dropRoot)
    } catch (error) {
      if (error && error.code !== 'EEXIST') throw error
    }
    const dropRootInfo = await lstat(dropRoot)
    if (!dropRootInfo.isDirectory() || dropRootInfo.isSymbolicLink()) {
      throw Object.assign(new Error('upload directory must be a real directory'), { statusCode: 403 })
    }
    const resolvedDropRoot = await realpath(dropRoot)
    if (!isInsideWorkspace(workspaceRoot, resolvedDropRoot)) {
      throw Object.assign(new Error('upload directory escapes the session workspace'), { statusCode: 403 })
    }

    const candidate = join(resolvedDropRoot, safeSessionId(sessionId))
    try {
      await mkdir(candidate)
    } catch (error) {
      if (error && error.code !== 'EEXIST') throw error
    }
    const candidateInfo = await lstat(candidate)
    if (!candidateInfo.isDirectory() || candidateInfo.isSymbolicLink()) {
      throw Object.assign(new Error('session upload directory must be a real directory'), { statusCode: 403 })
    }
    const directory = await realpath(candidate)
    if (!isInsideWorkspace(workspaceRoot, directory)) {
      throw Object.assign(new Error('upload directory escapes the session workspace'), { statusCode: 403 })
    }
    return directory
  }

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/dsh-vscode-drop',
    methods: ['POST'],
    requestBody: 'streaming',
    fetch: async (request) => {
      try {
        const data = await readRequestBody(request, MAX_BYTES)
        const sessionId = String(request.headers.get('x-session-id') || '')
        if (!sessionId || sessionId.length > 256) return jsonResponse(400, { error: 'invalid session id' })

        let rawName = request.headers.get('x-file-name') || 'upload.bin'
        try { rawName = decodeURIComponent(rawName) } catch { /* use the undecoded header */ }
        const fileName = safeFileName(rawName)
        const directory = await storageDirFor(sessionId)
        const digest = createHash('sha256').update(data).digest('hex').slice(0, 12)
        const nonce = randomBytes(6).toString('hex')
        const destination = join(directory, `${digest}-${nonce}-${fileName}`)
        // Exclusive creation prevents a pre-existing symlink from redirecting the write.
        await writeFile(destination, data, { flag: 'wx' })
        return jsonResponse(200, { path: destination, name: fileName, bytes: data.length })
      } catch (error) {
        const status = errorStatus(error)
        console.error('[dsh-vscode-bridge] file drop failed:', error)
        return jsonResponse(status, { error: status === 413 ? 'payload too large' : 'upload failed' })
      }
    }
  }))

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/dsh-vscode-path-check',
    methods: ['POST'],
    requestBody: 'streaming',
    fetch: async (request) => {
      try {
        const body = await readRequestBody(request, MAX_CHECK_BODY_BYTES)
        const payload = JSON.parse(body.toString('utf8'))
        const sessionId = String(request.headers.get('x-session-id') || '')
        if (!sessionId || sessionId.length > 256 || !ctx.sessions.get(sessionId)) {
          return jsonResponse(400, { error: 'invalid session id' })
        }
        if (!payload || !Array.isArray(payload.paths) || payload.paths.length === 0 ||
            payload.paths.length > MAX_CHECK_PATHS ||
            payload.paths.some((path) => typeof path !== 'string' || path.length === 0 || path.length > 4096)) {
          return jsonResponse(400, { error: 'invalid paths' })
        }

        const accessible = await Promise.all(payload.paths.map(async (path) => {
          try {
            const info = await stat(path)
            if (!info.isFile() && !info.isDirectory()) return false
            await access(path, fsConstants.R_OK)
            return true
          } catch {
            return false
          }
        }))
        return jsonResponse(200, { accessible })
      } catch (error) {
        const status = errorStatus(error, 400)
        return jsonResponse(status, { error: status === 413 ? 'payload too large' : 'invalid request' })
      }
    }
  }))
}
