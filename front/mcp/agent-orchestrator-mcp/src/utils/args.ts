export type ToolArguments = Record<string, unknown>

export function requireString(args: ToolArguments, key: string) {
  const value = args[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${key} 必须是非空字符串`)
  }
  return value
}

export function optionalString(args: ToolArguments, key: string) {
  const value = args[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw new Error(`${key} 必须是字符串`)
  }
  return value
}

export function optionalNumber(args: ToolArguments, key: string) {
  const value = args[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${key} 必须是数字`)
  }
  return value
}

export function optionalStringArray(args: ToolArguments, key: string) {
  const value = args[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${key} 必须是字符串数组`)
  }
  return value as string[]
}

export function optionalObjectArray(args: ToolArguments, key: string) {
  const value = args[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`${key} 必须是对象数组`)
  }
  return value as ToolArguments[]
}
