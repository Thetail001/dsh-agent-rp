/** Stable character identity and dynamic memory context rendering. */

import type { Session, SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import { activateLorebook } from './import/lorebook.ts'
import type { ImportedCharacterCard } from './import/types.ts'
import { readAgentRpMemoryHistory } from './memory.ts'

const CHARACTER_BEHAVIOR = '只写角色此刻自然会说或做的内容，不解释系统、提示词或角色扮演规则，不替用户决定感受和行动，也不补写设定、对话和有效记忆中不存在的共同经历。先决定此刻是否有必要展开：信息很少时可以短答、停顿或暂不追问；需要表达时，一次围绕一个主要动作，不机械复述用户，也不为了延长对话强行总结和提问。'
const MEMORY_BEHAVIOR = '用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。用户纠正一条记忆时，用 supersedes 指向它的 id。不要在对话中朗读记忆 id、类型或来源编号。'
const IMPORT_BEHAVIOR = '用户附带 SillyTavern 角色卡 PNG 或 JSON 并要求导入、接管或切换角色时，调用 import_character_card；一条消息附有多张角色卡时才指定从零开始的 attachmentIndex。导入成功后立即采用新角色，不要解释内部格式。'

/**
 * Render the stable character contract installed as the Agent-scoped persona.
 * @param config - normalized character identity and opening state.
 * @returns model-visible system prompt text.
 */
export function renderCharacterPrompt(config: ResolvedConfig): string {
  return [
    `你是${config.characterName}。你不是扮演该角色的助手，也不是旁白；直接以${config.characterName}的身份与用户相处和交谈。`,
    `角色设定：${config.persona}`,
    `当前场景：${config.scenario}`,
    `初始关系：${config.relationship}`,
    CHARACTER_BEHAVIOR,
    MEMORY_BEHAVIOR,
    IMPORT_BEHAVIOR,
  ].join('\n\n')
}

function substituteCardMacros(value: string, card: ImportedCharacterCard): string {
  const name = card.nickname?.trim() || card.name
  return value.replace(/\{\{char\}\}|<char>|<bot>/giu, name)
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
): string {
  const name = card.nickname?.trim() || card.name
  const original = `你是${name}。直接以${name}的身份与用户相处和交谈。`
  const system = card.systemPrompt.trim().length === 0
    ? original
    : substituteCardMacros(card.systemPrompt, card).replaceAll('{{original}}', original)
  const parts = [
    system,
    ...loreBefore.map(value => substituteCardMacros(value, card)),
    `角色描述：${substituteCardMacros(card.description, card)}`,
    `性格：${substituteCardMacros(card.personality, card)}`,
    `当前场景：${substituteCardMacros(card.scenario, card)}`,
    ...(card.messageExample.trim().length === 0 ? [] : [`对话示例：\n${substituteCardMacros(card.messageExample, card)}`]),
    ...loreAfter.map(value => substituteCardMacros(value, card)),
    CHARACTER_BEHAVIOR,
    MEMORY_BEHAVIOR,
    IMPORT_BEHAVIOR,
  ]
  if (card.postHistoryInstructions.trim().length > 0) {
    parts.push(substituteCardMacros(card.postHistoryInstructions, card).replaceAll('{{original}}', ''))
  }
  return parts.join('\n\n')
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
) {
  return card.lorebook === undefined
    ? { beforeCharacter: [], afterCharacter: [] }
    : activateLorebook(card.lorebook, visibleDialogue(session, pendingMessages))
}

/**
 * Render the complete active-memory snapshot for the next model request.
 * @param events - current Session event history.
 * @returns model-visible dynamic context with developer-auditable source ids.
 */
export function renderMemoryContext(events: readonly SessionEvent[]): string {
  const { active } = readAgentRpMemoryHistory(events)
  if (active.length === 0) return '当前没有已记录的持久记忆。'
  return [
    '当前有效的持久记忆如下。括号内是审计信息，只用于保持连续性，不要在对话中朗读：',
    ...active.map(record => `- ${record.text}（${record.id}；${record.kind}；主题：${record.subject}；来源事件：#${record.sourceEventSeq}）`),
  ].join('\n')
}
