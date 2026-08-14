/** Workspace preferences for new Agent RP entry points. */

/** Same-origin Host route for Agent RP workspace preferences. */
export const AGENT_RP_WORKSPACE_SETTINGS_PATH = '/api/agent-rp/settings'

/** Field selecting whether every workspace or an allowlist shows RP entry points. */
export const AGENT_RP_WORKSPACE_MODE_FIELD = 'workspaceMode'

/** Field containing workspace ids enabled in selected-workspace mode. */
export const AGENT_RP_WORKSPACE_IDS_FIELD = 'workspaceIds'

/** Supported workspace visibility modes. */
export const AGENT_RP_WORKSPACE_MODES = ['all', 'selected'] as const

/** Image providers available in the first local generation release. */
export const AGENT_RP_IMAGE_PROVIDERS = ['openai', 'a1111'] as const

/** Durable image provider settings; credentials are stored separately. */
export interface ImageGenerationSettings {
  readonly provider: typeof AGENT_RP_IMAGE_PROVIDERS[number]
  readonly openai: {
    readonly endpoint: string
    readonly model: string
    readonly size: '1024x1024' | '1024x1536' | '1536x1024'
  }
  readonly a1111: {
    readonly endpoint: string
    readonly model: string
    readonly width: number
    readonly height: number
    readonly steps: number
    readonly cfgScale: number
    readonly sampler: string
    readonly negativePrompt: string
  }
}

/** One reusable, non-secret image provider configuration. */
export interface ImageGenerationProfile {
  readonly id: string
  readonly name: string
  readonly settings: ImageGenerationSettings
}

/** Workspace visibility mode for new Agent RP entry points. */
export type AgentRpWorkspaceMode = typeof AGENT_RP_WORKSPACE_MODES[number]

/** Persisted Agent RP settings. */
export interface AgentRpSettings {
  /** Whether entry points appear everywhere or only in selected workspaces. */
  readonly workspaceMode: AgentRpWorkspaceMode
  /** Stable DSH workspace ids enabled by selected-workspace mode. */
  readonly workspaceIds: string[]
  /** Provider and generation defaults for explicit roleplay image requests. */
  readonly imageGeneration: ImageGenerationSettings
  /** Selected reusable image provider configuration. */
  readonly activeImageProfileId: string
  /** Reusable image provider configurations; credentials remain in the Host credential store. */
  readonly imageProfiles: ImageGenerationProfile[]
}

const DEFAULT_IMAGE_PROFILE_ID = 'default'
const DEFAULT_IMAGE_GENERATION_SETTINGS: ImageGenerationSettings = {
  provider: 'openai',
  openai: {
    endpoint: 'https://api.openai.com/v1/images/generations',
    model: 'gpt-image-1',
    size: '1024x1024',
  },
  a1111: {
    endpoint: 'http://127.0.0.1:7860',
    model: '',
    width: 768,
    height: 1024,
    steps: 28,
    cfgScale: 7,
    sampler: 'DPM++ 2M Karras',
    negativePrompt: '',
  },
}

/** Default settings preserve the existing all-workspace behavior. */
export const DEFAULT_AGENT_RP_SETTINGS: AgentRpSettings = {
  workspaceMode: 'all',
  workspaceIds: [],
  imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
  activeImageProfileId: DEFAULT_IMAGE_PROFILE_ID,
  imageProfiles: [{
    id: DEFAULT_IMAGE_PROFILE_ID,
    name: '默认配置',
    settings: DEFAULT_IMAGE_GENERATION_SETTINGS,
  }],
}

function text(value: unknown, fallback: string, max: number, label: string): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}无效`)
  return value.trim()
}

function endpoint(value: unknown, fallback: string, label: string): string {
  const candidate = text(value, fallback, 2_000, label)
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error(`${label}无效`)
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    || parsed.username !== '' || parsed.password !== '' || parsed.hash !== '') throw new Error(`${label}无效`)
  return candidate
}

function integer(value: unknown, fallback: number, min: number, max: number, label: string): number {
  const candidate = value === undefined ? fallback : value
  if (!Number.isSafeInteger(candidate) || Number(candidate) < min || Number(candidate) > max) throw new Error(`${label}无效`)
  return Number(candidate)
}

function finite(value: unknown, fallback: number, min: number, max: number, label: string): number {
  const candidate = value === undefined ? fallback : value
  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < min || candidate > max) {
    throw new Error(`${label}无效`)
  }
  return candidate
}

/** Normalize image settings while accepting pre-image-generation settings files. */
export function normalizeImageGenerationSettings(value: unknown): ImageGenerationSettings {
  if (value === undefined) return structuredClone(DEFAULT_AGENT_RP_SETTINGS.imageGeneration)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Agent RP 图片设置不是对象')
  const record = value as Record<string, unknown>
  if (record.provider !== 'openai' && record.provider !== 'a1111') throw new Error('Agent RP 图片提供方无效')
  const openai = typeof record.openai === 'object' && record.openai !== null && !Array.isArray(record.openai)
    ? record.openai as Record<string, unknown> : {}
  const a1111 = typeof record.a1111 === 'object' && record.a1111 !== null && !Array.isArray(record.a1111)
    ? record.a1111 as Record<string, unknown> : {}
  const size = openai.size ?? DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.size
  if (size !== '1024x1024' && size !== '1024x1536' && size !== '1536x1024') throw new Error('OpenAI 图片尺寸无效')
  return {
    provider: record.provider,
    openai: {
      endpoint: endpoint(openai.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.endpoint, 'OpenAI 图片服务地址'),
      model: text(openai.model, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.model, 200, 'OpenAI 图片模型'),
      size,
    },
    a1111: {
      endpoint: endpoint(a1111.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.endpoint, 'A1111 图片服务地址'),
      model: text(a1111.model, '', 500, 'A1111 模型'),
      width: integer(a1111.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.width, 256, 2_048, 'A1111 宽度'),
      height: integer(a1111.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.height, 256, 2_048, 'A1111 高度'),
      steps: integer(a1111.steps, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.steps, 1, 150, 'A1111 步数'),
      cfgScale: finite(a1111.cfgScale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.cfgScale, 0, 30, 'A1111 CFG'),
      sampler: text(a1111.sampler, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.sampler, 300, 'A1111 采样器'),
      negativePrompt: text(a1111.negativePrompt, '', 8_000, 'A1111 负面提示词'),
    },
  }
}

/**
 * Validate one persisted or wire settings value.
 * @param value - untrusted JSON value.
 * @returns normalized settings with duplicate ids removed.
 */
export function normalizeAgentRpSettings(value: unknown): AgentRpSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agent RP 设置不是对象')
  }
  const record = value as Record<string, unknown>
  const workspaceMode = record.workspaceMode
  const workspaceIds = record.workspaceIds
  if ((workspaceMode !== 'all' && workspaceMode !== 'selected') || !Array.isArray(workspaceIds)
    || workspaceIds.length > 1_000 || workspaceIds.some(id => typeof id !== 'string'
      || id.trim() !== id || id === '' || id.length > 256)) {
    throw new Error('Agent RP 工作区设置字段无效')
  }
  const imageGeneration = normalizeImageGenerationSettings(record.imageGeneration)
  let imageProfiles: ImageGenerationProfile[]
  let activeImageProfileId: string
  if (record.imageProfiles === undefined) {
    activeImageProfileId = DEFAULT_IMAGE_PROFILE_ID
    imageProfiles = [{ id: activeImageProfileId, name: '默认配置', settings: imageGeneration }]
  } else {
    if (!Array.isArray(record.imageProfiles) || record.imageProfiles.length === 0 || record.imageProfiles.length > 50) {
      throw new Error('图片服务配置档案无效')
    }
    imageProfiles = record.imageProfiles.map(value => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('图片服务配置档案无效')
      const profile = value as Record<string, unknown>
      if (typeof profile.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/iu.test(profile.id)) {
        throw new Error('图片服务配置档案 id 无效')
      }
      if (typeof profile.name !== 'string' || profile.name.trim() === '' || profile.name.trim().length > 80) {
        throw new Error('图片服务配置档案名称无效')
      }
      return { id: profile.id, name: profile.name.trim(), settings: normalizeImageGenerationSettings(profile.settings) }
    })
    if (new Set(imageProfiles.map(profile => profile.id)).size !== imageProfiles.length) {
      throw new Error('图片服务配置档案 id 重复')
    }
    if (new Set(imageProfiles.map(profile => profile.name.toLowerCase())).size !== imageProfiles.length) {
      throw new Error('图片服务配置档案名称重复')
    }
    activeImageProfileId = typeof record.activeImageProfileId === 'string'
      ? record.activeImageProfileId : imageProfiles[0]!.id
    if (!imageProfiles.some(profile => profile.id === activeImageProfileId)) {
      throw new Error('当前图片服务配置档案不存在')
    }
  }
  const activeImageGeneration = imageProfiles.find(profile => profile.id === activeImageProfileId)!.settings
  return {
    workspaceMode,
    workspaceIds: [...new Set(workspaceIds as string[])],
    imageGeneration: activeImageGeneration,
    activeImageProfileId,
    imageProfiles,
  }
}

/**
 * Decide whether a workspace may show a new Agent RP entry point.
 * @param settings - resolved Host settings, or undefined before they are available.
 * @param workspaceId - workspace owning the current Session, when registered.
 * @returns whether the entry point should be visible.
 */
export function allowsAgentRpEntry(
  settings: Pick<AgentRpSettings, 'workspaceMode' | 'workspaceIds'> | undefined,
  workspaceId: string | undefined,
): boolean {
  const resolved = settings ?? DEFAULT_AGENT_RP_SETTINGS
  return resolved.workspaceMode === 'all'
    || (workspaceId !== undefined && resolved.workspaceIds.includes(workspaceId))
}
