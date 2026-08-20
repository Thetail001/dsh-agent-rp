/** Fixed post-persona guidance for framework tools, Agent RP tools, and deployment-owned MCP instructions. */

import type { ResolvedToolGuidanceConfig } from './config.ts'

const MEMORY_BEHAVIOR = '已记录的内容是角色自然知道的背景，不是本轮必须提及的话题。只在和当前对话直接相关时使用；默认通过回答、称呼或行动自然体现，不主动说“我记得”“你之前说过”“我一直记着”，也不完整复述记录。只有用户明确询问记忆本身时才简短确认。用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。写入前先看当前有效记忆：内容已经覆盖时不要重复调用；同一主题发生变化时，用 supersedes 更新原记录，不要新增同主题记录。不要在对话中朗读记忆 id、类型或主题标签。'
const IMPORT_BEHAVIOR = '用户附带 SillyTavern 角色卡 PNG、JSON 或 CHARX 并要求导入、接管或切换角色时，调用 import_character_card；附带独立 World Info / 世界书 JSON 并要求导入时，调用 import_world_info；附带 Chat Completion 预设 JSON 并要求导入时，调用 import_sillytavern_preset。一条消息附有多个同类文件时才指定从零开始的 attachmentIndex。导入成功后直接采用新角色、世界设定或预设，不解释内部格式。'
const PUBLISH_BEHAVIOR = '图片发布流程：如果本轮某个工具直接返回了标准图片附件，调用 publish_roleplay_image 并完全省略 path 参数（不要传空字符串）。如果工具返回的是 URL，先用当前可用的 shell 工具下载到 Session 工作区；返回 base64 时先用 shell 工具解码成工作区文件；返回文件路径或文件附件时先移动/复制到 Session 工作区。然后调用 publish_roleplay_image 并传入真实的工作区 path。不要把 URL、base64、临时链接或猜测路径直接传给 path，也不要把临时图片 URL 写成 Markdown 图片。调用失败时先读返回的指导，修正一个步骤后再试；如果仍然无法得到工作区图片文件，就停止调用并继续角色回复，不要重复相同参数。'

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
