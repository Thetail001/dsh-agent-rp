/** Configurable identity and scene for one persistent Agent RP character. */

import z from '@deepseek-ai/schemastery'

/** Runtime placement of one bundle row. */
export type AgentRpMode = 'host' | 'character'

/** Whether roleplay turns must avoid, may choose, or should attempt image generation. */
export type AgentRpImageMode = 'never' | 'auto' | 'always'

/** One deployment-owned prompt entry appended in the fixed Agent RP tool-guidance block. */
export interface ToolGuidanceEntryConfig {
  id: string
  enabled?: boolean
  text: string
}

/** Prompt and Agent RP tool controls shared by every character Session in this preset. */
export interface ToolGuidanceConfig {
  enabled?: boolean
  includeFramework?: boolean
  includeAgentRp?: boolean
  imageMode?: AgentRpImageMode
  custom?: ToolGuidanceEntryConfig[]
}

/** Preconfigured Comfy Cloud Saved Workflow orchestration used by the WebUI defaults. */
export const DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT = `使用当前已配置且实际可见的 Comfy Cloud MCP 工具生成角色插图。目标工作流为 image_z_image_turbo。

优先将 image_z_image_turbo 作为 filename 调用 get_saved_workflow，并使用 summary_only 查看工作流实际暴露的 customizable_inputs。若找不到，再调用 list_saved_workflows 查找同名工作流，并严格使用工具返回的 filename；不要自行猜测或补充扩展名。

根据当前角色、服装、环境、动作、情绪和镜头构图生成适合本轮剧情的绘图提示词。仅覆盖 get_saved_workflow 明确暴露的文本提示词等输入；参数名称、节点 ID 和 slot 地址必须来自工具返回值，不要猜测。没有可安全覆盖的输入时，保留工作流默认值。

随后调用 run_saved_workflow 运行该工作流。若工具要求消费额度确认，首次调用不要擅自传入 confirm: true；只有用户已经明确同意本次消费后才能确认。

run_saved_workflow 返回任务后，按照实际返回值调用 wait_for_job 等待完成，再调用 get_output 获取输出。不要循环调用 get_job_status。

get_output 返回下载命令后，使用当前可用的 bash/shell 工具执行下载。URL 和查询参数必须原样保留；只允许把输出路径调整到当前 Session 工作区（例如 comfy-output.png），不要保存到 get_output 建议的 Downloads 目录。下载成功后，把命令实际写入的工作区文件路径传给 publish_roleplay_image：

publish_roleplay_image({
  path: "<命令实际写入的工作区文件路径>",
  caption: "<可选的简短角色内配文>"
})

不要把 URL、base64、空字符串或猜测路径直接传给 path。publish_roleplay_image 失败时先阅读它返回的下一步指导；如果无法在工作区得到图片文件，就停止调用并继续角色回复。绝对不要把 get_output 的临时 URL 以 Markdown 图片写进最终回复。

任一步失败、工具不可见、工作流不存在或输出路径无法确认时，不循环重试，不编造成功结果；继续正常角色回复，只在确有必要时简短说明图片未生成。`

/** Default original character used by the local preview profile. */
export const DEFAULT_CHARACTER_NAME = '岚'
/** Default character traits; deployments may replace this text without changing the runtime. */
export const DEFAULT_PERSONA = '二十七岁，经营一家傍晚开门的旧书修复铺。观察敏锐，话不多，熟悉之后会显出一点促狭；不卖弄知识，也不急着把每句话说成结论。'
/** Default opening situation for a fresh conversation. */
export const DEFAULT_SCENARIO = '一个下雨的傍晚，用户在修复铺打烊前走了进来。你们见过几次，还没有熟到无话不谈。'
/** Default relationship state before durable conversation memories accumulate. */
export const DEFAULT_RELATIONSHIP = '你对用户有克制的熟悉感，愿意认真听对方说话；关系怎样变化，由后续对话决定。'

/** Conservative defaults: keep existing guidance, expose publishing, and let the Agent decide when to draw. */
export const DEFAULT_TOOL_GUIDANCE: ResolvedToolGuidanceConfig = {
  enabled: true,
  includeFramework: true,
  includeAgentRp: true,
  imageMode: 'auto',
  custom: [{
    id: 'comfy-cloud-saved-workflow',
    enabled: true,
    text: DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT,
  }],
}

/** Deployment-owned Agent RP character configuration. */
export interface Config {
  /** Host installs the bundled preset; character contributes its scoped runtime. */
  mode?: AgentRpMode
  /** Name the Agent uses as its own identity. */
  characterName?: string
  /** Stable identity, temperament, knowledge, and behavioral boundaries. */
  persona?: string
  /** Situation in which a fresh Session begins. */
  scenario?: string
  /** Initial relationship before Session-owned memories modify it. */
  relationship?: string
  /** Fixed post-persona tool guidance and optional custom MCP instructions. */
  toolGuidance?: ToolGuidanceConfig
}

const ToolGuidanceEntryConfig: z<ToolGuidanceEntryConfig> = z.object({
  id: z.string().min(1).max(80),
  enabled: z.boolean().default(true),
  text: z.string().min(1).max(12_000),
})

const ToolGuidanceConfig: z<ToolGuidanceConfig> = z.object({
  enabled: z.boolean().default(true),
  includeFramework: z.boolean().default(true),
  includeAgentRp: z.boolean().default(true),
  imageMode: z.union(['never', 'auto', 'always']).default('auto'),
  custom: z.array(ToolGuidanceEntryConfig).default([]),
})

/** Loader schema for the Agent RP character configuration. */
export const Config: z<Config> = z.object({
  mode: z.union(['host', 'character']).default('character'),
  characterName: z.string().min(1).max(80).default(DEFAULT_CHARACTER_NAME),
  persona: z.string().min(1).max(4_000).default(DEFAULT_PERSONA),
  scenario: z.string().min(1).max(4_000).default(DEFAULT_SCENARIO),
  relationship: z.string().min(1).max(2_000).default(DEFAULT_RELATIONSHIP),
  toolGuidance: ToolGuidanceConfig.default({
    enabled: true,
    includeFramework: true,
    includeAgentRp: true,
    imageMode: 'auto',
    custom: [{
      id: 'comfy-cloud-saved-workflow',
      enabled: true,
      text: DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT,
    }],
  }),
})

/** Fully normalized tool-guidance entry. */
export interface ResolvedToolGuidanceEntryConfig {
  readonly id: string
  readonly enabled: boolean
  readonly text: string
}

/** Fully normalized fixed tool-guidance block. */
export interface ResolvedToolGuidanceConfig {
  readonly enabled: boolean
  readonly includeFramework: boolean
  readonly includeAgentRp: boolean
  readonly imageMode: AgentRpImageMode
  readonly custom: readonly ResolvedToolGuidanceEntryConfig[]
}

/** Fully materialized, normalized Agent RP configuration. */
export interface ResolvedConfig {
  readonly mode: AgentRpMode
  readonly characterName: string
  readonly persona: string
  readonly scenario: string
  readonly relationship: string
  readonly toolGuidance: ResolvedToolGuidanceConfig
}

function requiredText(value: string | undefined, fallback: string, field: string): string {
  const normalized = (value ?? fallback).trim()
  if (normalized.length === 0) throw new TypeError(`${field} must contain non-whitespace text`)
  return normalized
}

/** Normalize loader or WebUI tool-guidance input at one shared trust boundary. */
export function normalizeToolGuidanceConfig(value: unknown): ResolvedToolGuidanceConfig {
  if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new TypeError('toolGuidance must be an object')
  }
  const source = value === undefined ? {} : value as Record<string, unknown>
  const bool = (field: 'enabled' | 'includeFramework' | 'includeAgentRp'): boolean => {
    const candidate = source[field]
    if (candidate === undefined) return DEFAULT_TOOL_GUIDANCE[field]
    if (typeof candidate !== 'boolean') throw new TypeError(`toolGuidance.${field} is invalid`)
    return candidate
  }
  const imageMode = source.imageMode ?? DEFAULT_TOOL_GUIDANCE.imageMode
  if (imageMode !== 'never' && imageMode !== 'auto' && imageMode !== 'always') {
    throw new TypeError('toolGuidance.imageMode is invalid')
  }
  const customSource = source.custom ?? DEFAULT_TOOL_GUIDANCE.custom
  if (!Array.isArray(customSource) || customSource.length > 32) {
    throw new TypeError('toolGuidance.custom is invalid')
  }
  const custom = customSource.map((value, index) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`toolGuidance.custom[${index}] is invalid`)
    }
    const entry = value as Record<string, unknown>
    if (typeof entry.id !== 'string' || entry.id.length > 80
      || typeof entry.text !== 'string' || entry.text.length > 12_000
      || (entry.enabled !== undefined && typeof entry.enabled !== 'boolean')) {
      throw new TypeError(`toolGuidance.custom[${index}] is invalid`)
    }
    return {
      id: requiredText(entry.id, '', `toolGuidance.custom[${index}].id`),
      enabled: entry.enabled ?? true,
      text: requiredText(entry.text, '', `toolGuidance.custom[${index}].text`),
    }
  })
  if (new Set(custom.map(entry => entry.id)).size !== custom.length) {
    throw new TypeError('toolGuidance custom entry ids must be unique')
  }
  return {
    enabled: bool('enabled'),
    includeFramework: bool('includeFramework'),
    includeAgentRp: bool('includeAgentRp'),
    imageMode,
    custom,
  }
}

/**
 * Normalize configuration even when the plugin is mounted without Loader validation.
 * @param config - loader-provided or direct plugin configuration.
 * @returns complete character configuration.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  return {
    mode: config.mode ?? 'character',
    characterName: requiredText(config.characterName, DEFAULT_CHARACTER_NAME, 'characterName'),
    persona: requiredText(config.persona, DEFAULT_PERSONA, 'persona'),
    scenario: requiredText(config.scenario, DEFAULT_SCENARIO, 'scenario'),
    relationship: requiredText(config.relationship, DEFAULT_RELATIONSHIP, 'relationship'),
    toolGuidance: normalizeToolGuidanceConfig(config.toolGuidance),
  }
}
