import path from 'node:path'

export function assertSafeWorkspaceRoot(workspaceRoot: string) {
  if (!path.isAbsolute(workspaceRoot)) {
    throw new Error('workspaceRoot 必须是绝对路径')
  }
}

export function resolveInsideWorkspace(workspaceRoot: string, targetPath: string) {
  assertSafeWorkspaceRoot(workspaceRoot)
  const normalizedRoot = path.normalize(workspaceRoot)
  const resolved = path.isAbsolute(targetPath)
    ? path.normalize(targetPath)
    : path.resolve(normalizedRoot, targetPath)
  const relative = path.relative(normalizedRoot, resolved)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`路径必须位于 workspaceRoot 内: ${targetPath}`)
  }

  return resolved
}
