# Errors

## [ERR-20260720-001] repository file inspection

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
Initial source inspection referenced a Swagger operation helper under the wrong directory.

### Error
```
sed: src/server/base/swagger/analys/operation.ts: No such file or directory
```

### Context
- Command attempted to inspect `analys/operation.ts` and `analys/schema.ts`.
- The helpers actually live under `src/server/base/swagger/utils/`.

### Suggested Fix
Enumerate module files with `rg --files` before opening assumed paths.

### Metadata
- Reproducible: yes
- Related Files: src/server/base/swagger/utils/operation.ts

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Located the real files with `rg --files` and continued inspection from `utils/`.

---

## [ERR-20260720-007] repository lint baseline

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
The full ESLint command fails on existing MCP SDK module-resolution errors and unrelated unused tool warnings.

### Error
```
4 import/no-unresolved errors for @modelcontextprotocol/sdk/*.js imports
5 @typescript-eslint/no-unused-vars warnings
```

### Context
- Command: `pnpm run lint`
- The `Server` SDK import moved from `src/index.ts` to `src/server-instance.ts`; the resolver error category and total SDK import count are unchanged.
- Four createApi/createUI warnings are unrelated baseline issues.
- One Swagger `logSwagger` warning is removable in this change.

### Suggested Fix
Configure eslint-import-resolver-typescript for the package's Node16 `.js` import convention in a separate repository-wide lint task.

### Metadata
- Reproducible: yes
- Related Files: .eslintrc.json, src/index.ts, src/server/index.ts, src/server-instance.ts

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Classified baseline resolver failures separately and removed the Swagger-specific unused import.

---

## [ERR-20260720-006] sandbox process inspection

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
The sandbox denied a read-only `ps` process inspection after the turn interruption.

### Error
```
zsh:1: operation not permitted: ps
```

### Context
- The command was used only to look for leftover `tsx` or Swagger client processes.
- The prior integration commands had already returned exit code 0.

### Suggested Fix
Rely on unified exec completion/session state unless process inspection is explicitly approved.

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: No further process inspection was required because all relevant commands had completed.

---

## [ERR-20260720-005] loader test starts MCP server

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
Importing the Swagger loader started the stdio MCP server and prevented the Node test process from exiting.

### Error
```
The two loader tests passed, but the process remained active until interrupted with SIGINT (exit 130).
```

### Context
- `analys/loader.ts` imports `utils/log.ts`.
- `utils/log.ts` imported `src/index.ts`, whose top-level `main()` connects the stdio server.
- The import side effect made isolated loader tests hang.

### Suggested Fix
Move the server instance into a side-effect-free module and keep handler registration and stdio startup in `src/index.ts`.

### Metadata
- Reproducible: yes
- Related Files: src/index.ts, src/server/base/swagger/utils/log.ts

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Refactoring the server instance import so library modules no longer execute the application entrypoint.

---

## [ERR-20260720-003] zsh empty config glob

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
A read-only inspection used an unmatched zsh glob for ESLint config files.

### Error
```
zsh:1: no matches found: eslint.config.*
```

### Context
- The repository has no file matching `eslint.config.*`.
- zsh treats unmatched globs as errors by default.

### Suggested Fix
Use `rg --files -g 'eslint.config.*'` or inspect the package lint script first.

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Future config discovery will use `rg --files` rather than a shell glob.

---

## [ERR-20260720-004] pnpm test sandbox IPC

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The tsx test runner could not create its IPC socket under the sandbox.

### Error
```
Error: listen EPERM: operation not permitted .../T/tsx-501/37465.pipe
[ELIFECYCLE] Test failed.
```

### Context
- Command: `pnpm test`
- Failure occurred before Node test assertions ran.

### Suggested Fix
Run test verification with the required permission for the tsx temporary IPC socket.

### Metadata
- Reproducible: yes
- Related Files: package.json, test/swagger-query.test.ts

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Identified as sandbox-only IPC restriction; rerunning with controlled escalation.

---

## [ERR-20260720-002] pnpm run build sandbox write

**Logged**: 2026-07-20T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
TypeScript build could not emit files because the target repository is outside the sandbox writable roots.

### Error
```
error TS5033: Could not write file '.../dist/index.js': EPERM: operation not permitted
[ELIFECYCLE] Command failed with exit code 2.
```

### Context
- Command: `pnpm run build`
- Repository: `/Users/zm/lm/lm-ai-future/front/mcp/front-mcp`
- The compiler reached emit and failed on filesystem permissions.

### Suggested Fix
Run build verification with the required elevated filesystem permission.

### Metadata
- Reproducible: yes
- Related Files: tsconfig.json, dist/

### Resolution
- **Resolved**: 2026-07-20T00:00:00+08:00
- **Notes**: Identified as sandbox-only write restriction; rerunning with controlled escalation.

---
