export type ToolDefinition = {
  name: string
  permissions?: string[]
}

export function canCallTool(tool: ToolDefinition, grantedPermissions: string[]): boolean {
  const required = tool.permissions ?? []
  return required.every((permission) => grantedPermissions.includes(permission))
}

export function assertToolAuthorized(tool: ToolDefinition, grantedPermissions: string[]) {
  if (!canCallTool(tool, grantedPermissions)) {
    throw new Error(`AI tool not authorized: ${tool.name}`)
  }
}
