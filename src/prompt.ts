/** Stable character identity and dynamic memory context rendering. */

import type { Session, SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import { activateLorebook } from './import/lorebook.ts'
import type { ImportedCharacterCard } from './import/types.ts'
import type { ImportedWorldInfo } from './import/types.ts'
import { readAgentRpMemoryHistory } from './memory.ts'
import { substituteMvuMacros } from './mvu.ts'

const CHARACTER_BEHAVIOR = '只写角色此刻自然会说或做的内容，不解释系统、提示词或角色扮演规则，不替用户决定感受和行动，也不补写设定、对话和有效记忆中不存在的共同经历。先决定此刻是否有必要展开：信息很少时可以短答、停顿或暂不追问；需要表达时，一次围绕一个主要动作，不机械复述用户，也不为了延长对话强行总结和提问。'
const MEMORY_BEHAVIOR = '已记录的内容是角色自然知道的背景，不是本轮必须提及的话题。只在和当前对话直接相关时使用；默认通过回答、称呼或行动自然体现，不主动说“我记得”“你之前说过”“我一直记着”，也不完整复述记录。只有用户明确询问记忆本身时才简短确认。用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。写入前先看当前有效记忆：内容已经覆盖时不要重复调用；同一主题发生变化时，用 supersedes 更新原记录，不要新增同主题记录。不要在对话中朗读记忆 id、类型或主题标签。'
const IMPORT_BEHAVIOR = '用户附带 SillyTavern 角色卡 PNG、JSON 或 CHARX 并要求导入、接管或切换角色时，调用 import_character_card；附带独立 World Info / 世界书 JSON 并要求导入时，调用 import_world_info；附带 Chat Completion 预设 JSON 并要求导入时，调用 import_sillytavern_preset。一条消息附有多个同类文件时才指定从零开始的 attachmentIndex。导入成功后直接采用新角色、世界设定或预设，不解释内部格式。'

function finalizeRoleplayPrompt(value: string, statData?: import('@deepseek-ai/dsh-session').JsonValue): string {
  let result = substituteMvuMacros(value, statData)
  for (;;) {
    const next = result.replace(/\{\{[^{}]*\}\}/gu, '')
    if (next === result) return result
    result = next
  }
}

/**
 * Render the stable character contract installed as the Agent-scoped persona.
 * @param config - normalized character identity and opening state.
 * @returns model-visible system prompt text.
 */
export function renderCharacterPrompt(
  config: ResolvedConfig,
  loreBefore: readonly string[] = [],
  loreAfter: readonly string[] = [],
): string {
  return finalizeRoleplayPrompt([
    `你是${config.characterName}。你不是扮演该角色的助手，也不是旁白；直接以${config.characterName}的身份与用户相处和交谈。`,
    ...loreBefore,
    `角色设定：${config.persona}`,
    `当前场景：${config.scenario}`,
    `初始关系：${config.relationship}`,
    ...loreAfter,
    CHARACTER_BEHAVIOR,
    MEMORY_BEHAVIOR,
    IMPORT_BEHAVIOR,
  ].join('\n\n'))
}

/**
 * Render the identity contract for a chat import that has history but no Character Card.
 * @param characterName - character named by the SillyTavern chat header.
 * @param userName - optional user name retained by that header.
 * @param userPersona - optional Persona description selected for the current Session.
 * @returns model-visible prompt that continues imported history without applying the deployment default persona.
 */
export function renderImportedChatPrompt(characterName: string, userName?: string, userPersona?: string): string {
  return finalizeRoleplayPrompt([
    `你是${characterName}。直接以${characterName}的身份延续当前会话。`,
    ...(userName === undefined ? [] : [`与您对话的人在导入记录中名为${userName}。`]),
    ...(userPersona?.trim() ? [`对方当前选择的 Persona：\n${userPersona.trim()}`] : []),
    '以已导入的对话历史为准；缺少角色卡时，不要补用其他角色的身份、经历、场景或关系设定。',
    CHARACTER_BEHAVIOR,
    MEMORY_BEHAVIOR,
    IMPORT_BEHAVIOR,
  ].join('\n\n'))
}

/**
 * Activate all Session-owned standalone World Info books for one request.
 * @param worldInfos - validated standalone books in Session import order.
 * @param session - current model-visible conversation history.
 * @param pendingMessages - messages claimed for this step but not yet derived from the Session.
 * @returns active entries divided by character position.
 */
export function renderImportedWorldInfos(
  worldInfos: readonly ImportedWorldInfo[],
  session: Session,
  pendingMessages: readonly UserMessage[] = [],
  scanText: readonly string[] = [],
) {
  const messages = [...visibleDialogue(session, pendingMessages), ...scanText]
  return worldInfos.reduce((result, worldInfo) => {
    const active = activateLorebook(worldInfo.lorebook, messages)
    result.beforeCharacter.push(...active.beforeCharacter)
    result.afterCharacter.push(...active.afterCharacter)
    return result
  }, { beforeCharacter: [] as string[], afterCharacter: [] as string[] })
}

/**
 * Resolve the two stable SillyTavern identity macros used throughout Character Card text.
 * @param value - card-owned prose.
 * @param card - active Character Card.
 * @param userName - Session-imported user name, or a neutral fallback when none is known.
 * @returns prose with character and user identity macros resolved.
 */
export function substituteCardMacros(
  value: string,
  card: ImportedCharacterCard,
  userName = '用户',
): string {
  const name = card.nickname?.trim() || card.name
  return value
    .replace(/\{\{char\}\}|<char>|<bot>/giu, name)
    .replace(/\{\{user\}\}|<user>/giu, userName)
}

/**
 * Render an imported Character Card as the complete Agent persona.
 * @param card - active Session-owned card.
 * @param loreBefore - active before-character lorebook text.
 * @param loreAfter - active after-character lorebook text.
 * @returns model-visible system prompt text.
 */
export function renderImportedCharacterPrompt(
  card: ImportedCharacterCard,
  loreBefore: readonly string[],
  loreAfter: readonly string[],
  userName?: string,
  statData?: import('@deepseek-ai/dsh-session').JsonValue,
  userPersona?: string,
): string {
  const name = card.nickname?.trim() || card.name
  const original = `你是${name}。直接以${name}的身份与用户相处和交谈。`
  const system = card.systemPrompt.trim().length === 0
    ? original
    : substituteCardMacros(card.systemPrompt, card, userName).replaceAll('{{original}}', original)
  const parts = [
    system,
    ...loreBefore.map(value => substituteCardMacros(value, card, userName)),
    `角色描述：${substituteCardMacros(card.description, card, userName)}`,
    `性格：${substituteCardMacros(card.personality, card, userName)}`,
    `当前场景：${substituteCardMacros(card.scenario, card, userName)}`,
    ...(userPersona?.trim() ? [`与角色对话的人：${userPersona.trim()}`] : []),
    ...(card.messageExample.trim().length === 0 ? [] : [`对话示例：\n${substituteCardMacros(card.messageExample, card, userName)}`]),
    ...loreAfter.map(value => substituteCardMacros(value, card, userName)),
    CHARACTER_BEHAVIOR,
    MEMORY_BEHAVIOR,
    IMPORT_BEHAVIOR,
  ]
  if (card.postHistoryInstructions.trim().length > 0) {
    parts.push(substituteCardMacros(card.postHistoryInstructions, card, userName).replaceAll('{{original}}', ''))
  }
  if (statData !== undefined) {
    parts.push('每次回复都必须在正文末尾完整输出一个 <UpdateVariable><Analysis>…</Analysis><JSONPatch>[…]</JSONPatch></UpdateVariable>；没有变量变化时 JSONPatch 也输出空数组。')
  }
  return finalizeRoleplayPrompt(parts.join('\n\n'), statData)
}

function dialogueText(messages: readonly UserMessage[]): string[] {
  return messages.flatMap(message => {
    if (message.source.kind !== 'user' && message.source.kind !== 'model') return []
    return message.content.flatMap(block => block.type === 'text' ? [block.text] : [])
  })
}

function visibleDialogue(session: Session, pendingMessages: readonly UserMessage[]): string[] {
  const history = session.deriveMessages()
  const historyIds = new Set(history.map(message => message.id))
  return [
    ...history.flatMap(message => {
      if (message.source.kind !== 'user' && message.source.kind !== 'model') return []
      return message.content.flatMap(block => block.type === 'text' ? [block.text] : [])
    }),
    ...dialogueText(pendingMessages.filter(message => !historyIds.has(message.id))),
  ]
}

/** Return model-visible dialogue text for preset marker assembly. */
export function roleplayVisibleDialogue(session: Session, pendingMessages: readonly UserMessage[] = []): string[] {
  return visibleDialogue(session, pendingMessages)
}

/**
 * Render active imported lorebook text for the next request.
 * @param card - active imported character.
 * @param session - current Session and model-visible surface.
 * @param pendingMessages - messages claimed for this step but not yet present in the Session.
 * @returns active entries divided by character position.
 */
export function renderImportedLorebook(
  card: ImportedCharacterCard,
  session: Session,
  pendingMessages: readonly UserMessage[] = [],
  statData?: import('@deepseek-ai/dsh-session').JsonValue,
  scanText: readonly string[] = [],
) {
  const active = card.lorebook === undefined
    ? { beforeCharacter: [], afterCharacter: [] }
    : activateLorebook(card.lorebook, [...visibleDialogue(session, pendingMessages), ...scanText])
  return {
    beforeCharacter: active.beforeCharacter.map(value => substituteMvuMacros(value, statData)),
    afterCharacter: active.afterCharacter.map(value => substituteMvuMacros(value, statData)),
  }
}

/**
 * Render the complete active-memory snapshot for the next model request.
 * @param events - current Session event history.
 * @returns model-visible dynamic context with ids needed for later correction.
 */
export function renderMemoryContext(events: readonly SessionEvent[]): string {
  const { active } = readAgentRpMemoryHistory(events)
  if (active.length === 0) return ''
  return finalizeRoleplayPrompt([
    '角色已知的持久背景如下。这不是本轮要逐条提及的清单；方括号内仅是更新记忆所需的内部索引：',
    ...active.map(record => `- [${record.id} | ${record.kind} | ${record.subject}] ${record.text}`),
  ].join('\n'))
}
