/** Model-free `/rp-draw` execution and cancellable provider lifecycle. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandId } from '@deepseek-ai/dsh-commands'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { GeneratedImageLibrary } from './generated-image-library.ts'
import { generateImage } from './image-generation-providers.ts'
import {
  encodeImageGenerationRecord,
  imageCredentialRefName,
  parseImageGenerationRequest,
} from './image-generation-protocol.ts'
import { WorkspaceSettingsStore } from './workspace-settings-store.ts'

const activeJobs = new Map<string, AbortController>()

function abortError(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError')
}

/** Abort one currently running image job in this Host process. */
export function cancelGeneratedImageJob(jobId: string): boolean {
  const controller = activeJobs.get(jobId)
  if (controller === undefined) return false
  controller.abort(new Error('图片生成已取消'))
  return true
}

/** Execute a user-requested image command without adding image bytes to model history. */
export async function executeImageGenerationCommand(
  library: GeneratedImageLibrary,
  settingsStore: WorkspaceSettingsStore,
  credentials: CredentialProvider,
  invocation: {
    readonly commandId: CommandId
    readonly agent: Agent
    readonly rawInput: string
    readonly signal: AbortSignal
  },
): Promise<{ readonly kind: 'success'; readonly text: string }> {
  const request = parseImageGenerationRequest(invocation.rawInput)
  const source = invocation.agent.session.events.at(-1)
  if (source?.type !== 'command/run' || source.data.name !== 'rp-draw'
    || String(source.data.commandId) !== String(invocation.commandId)) {
    throw new Error('图片生成命令不是当前 Session 事件')
  }
  const settings = settingsStore.get().imageGeneration
  library.begin(request, settings.provider)
  const controller = new AbortController()
  const relayAbort = (): void => { controller.abort(invocation.signal.reason) }
  invocation.signal.addEventListener('abort', relayAbort, { once: true })
  activeJobs.set(request.jobId, controller)
  try {
    const credential = await credentials.resolve(credentialRef(imageCredentialRefName(settings.provider)))
    const asset = await generateImage(
      settings,
      credential?.value,
      request.prompt,
      controller.signal,
      (progress, phase) => { library.progress(request.jobId, progress, phase) },
    )
    return { kind: 'success', text: encodeImageGenerationRecord(library.complete(request.jobId, asset)) }
  } catch (error: unknown) {
    if (abortError(error, controller.signal)) {
      library.cancelled(request.jobId)
      throw new Error('图片生成已取消')
    }
    const message = error instanceof Error ? error.message : String(error)
    library.fail(request.jobId, message)
    throw new Error(message)
  } finally {
    invocation.signal.removeEventListener('abort', relayAbort)
    activeJobs.delete(request.jobId)
  }
}
