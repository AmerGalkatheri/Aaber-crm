export interface AIProvider { generate(input: { system?: string; messages: { role: string; content: string }[] }): Promise<{ text: string; provider: string }> }
export interface ToolContext { agentId: string; allowedTools: Set<string> }
export interface AITool { name: string; execute(input: unknown): Promise<unknown> }

export class AIGateway {
  constructor(private readonly provider: AIProvider, private readonly tools: Map<string, AITool>) {}
  async generate(messages: { role: string; content: string }[], system?: string) { return this.provider.generate({ messages, system }) }
  async callTool(name: string, input: unknown, context: ToolContext) {
    if (!context.allowedTools.has(name)) throw new Error(`AI tool not authorized: ${name}`)
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`AI tool not registered: ${name}`)
    return tool.execute(input)
  }
}
