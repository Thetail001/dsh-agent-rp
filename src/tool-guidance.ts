/** Fixed post-persona guidance for framework tools, Agent RP tools, and deployment-owned MCP instructions. */

import type { ResolvedToolGuidanceConfig } from './config.ts'

const MEMORY_BEHAVIOR = '已记录的内容是角色自然知道的背景，不是本轮必须提及的话题。只在和当前对话直接相关时使用；默认通过回答、称呼或行动自然体现，不主动说“我记得”“你之前说过”“我一直记着”，也不完整复述记录。只有用户明确询问记忆本身时才简短确认。用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。写入前先看当前有效记忆：内容已经覆盖时不要重复调用；同一主题发生变化时，用 supersedes 更新原记录，不要新增同主题记录。不要在对话中朗读记忆 id、类型或主题标签。'
const IMPORT_BEHAVIOR = '用户附带 SillyTavern 角色卡 PNG、JSON 或 CHARX 并要求导入、接管或切换角色时，调用 import_character_card；附带独立 World Info / 世界书 JSON 并要求导入时，调用 import_world_info；附带 Chat Completion 预设 JSON 并要求导入时，调用 import_sillytavern_preset。一条消息附有多个同类文件时才指定从零开始的 attachmentIndex。导入成功后直接采用新角色、世界设定或预设，不解释内部格式。'
const PUBLISH_BEHAVIOR = '生图工具已直接返回标准图片时，调用 publish_roleplay_image 且省略 path。生图工具返回 URL、下载命令或远程资产时，先根据工具结果选择当前可用的下载或命令工具，将图片保存到当前会话工作区，再调用 publish_roleplay_image 并传入工作区内的 path。不要伪造路径，不要在下载尚未成功时发布。发布成功后再给出本轮最终的角色回复，不在正文中解释内部工具链。'

function imagePolicy(mode: ResolvedToolGuidanceConfig['imageMode']): string {
  if (mode === 'never') {
    return '图像策略：禁止。不调用任何生图、图像下载或 publish_roleplay_image 工具，即使其他条目描述了这些工具。'
  }
  if (mode === 'always') {
    return '图像策略：每个由用户普通对话触发的角色扮演回合都尝试生成并发布一张对应图片。导入、管理、调试等非角色对话操作不触发生图。每轮最多尝试一条完整生图链；工具不可用或失败时不循环重试，继续正常角色回复。'
  }
  return '图像策略：由你决定。用户明确要求图片，或当前场景显著受益于一张插图时，可以生成并发布；普通对话不必为了延长交互而生图。每轮最多尝试一条完整生图链，失败时不循环重试。'
}

/** Render the one fixed block appended after every default, imported-card, or imported-preset persona. */
export function renderToolGuidance(config: ResolvedToolGuidanceConfig): string {
  if (!config.enabled) return ''
  const parts = [
    '【Agent RP 工具指导】',
    ...(config.includeFramework ? [MEMORY_BEHAVIOR, IMPORT_BEHAVIOR] : []),
    ...(config.includeAgentRp && config.imageMode !== 'never' ? [PUBLISH_BEHAVIOR] : []),
    ...config.custom.filter(entry => entry.enabled).map(entry => `自定义工具指导（${entry.id}）：\n${entry.text}`),
    imagePolicy(config.imageMode),
  ]
  return parts.join('\n\n')
}

/** Append tool guidance at the sole complete persona boundary. */
export function withToolGuidance(persona: string, config: ResolvedToolGuidanceConfig): string {
  const guidance = renderToolGuidance(config)
  return guidance === '' ? persona : `${persona}\n\n${guidance}`
}
