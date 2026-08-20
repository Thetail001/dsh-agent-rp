/** File-backed image job metadata and generated assets. */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  isImageJobId,
  parseImageGenerationRequest,
  type GeneratedImageJob,
  type ImageGenerationRequest,
} from './image-generation-protocol.ts'

const MAX_IMAGE_BYTES = 32 * 1024 * 1024

/** Filesystem override used by focused checks and portable deployments. */
export interface GeneratedImageLibraryOptions {
  readonly root?: string
}

/** Raw immutable image asset stored for one completed job. */
export interface GeneratedImageAsset {
  readonly data: Uint8Array
  readonly mediaType: 'image/png' | 'image/jpeg' | 'image/webp'
}

function parseJob(value: unknown): GeneratedImageJob {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('图片任务元数据不是对象')
  const record = value as Record<string, unknown>
  const request = parseImageGenerationRequest(record.request)
  const statuses = ['queued', 'running', 'completed', 'failed', 'cancelled']
  const validImage = record.image === undefined || (typeof record.image === 'object' && record.image !== null
    && !Array.isArray(record.image)
    && ['image/png', 'image/jpeg', 'image/webp'].includes(String((record.image as Record<string, unknown>).mediaType))
    && Number.isSafeInteger((record.image as Record<string, unknown>).bytes)
    && Number((record.image as Record<string, unknown>).bytes) > 0)
  if (record.format !== 0 || typeof record.id !== 'string' || !isImageJobId(record.id) || record.id !== request.jobId
    || (record.provider !== 'openai' && record.provider !== 'novelai'
      && record.provider !== 'a1111' && record.provider !== 'comfyui'
      && record.provider !== 'external')
    || typeof record.status !== 'string' || !statuses.includes(record.status)
    || typeof record.progress !== 'number' || !Number.isFinite(record.progress) || record.progress < 0 || record.progress > 1
    || typeof record.phase !== 'string' || record.phase.length > 200
    || !Number.isSafeInteger(record.createdAt) || Number(record.createdAt) < 0
    || !Number.isSafeInteger(record.updatedAt) || Number(record.updatedAt) < 0
    || !validImage || (record.error !== undefined && (typeof record.error !== 'string' || record.error.length > 4_000))) {
    throw new Error('图片任务元数据字段无效')
  }
  return record as unknown as GeneratedImageJob
}

/** Small atomic store for generated images and their progress. */
export class GeneratedImageLibrary {
  readonly root: string

  constructor(options: GeneratedImageLibraryOptions = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'generated-images'))
  }

  /** Create one queued job without overwriting an earlier conversation record. */
  begin(request: ImageGenerationRequest, provider: GeneratedImageJob['provider']): GeneratedImageJob {
    const normalized = parseImageGenerationRequest(request)
    if (existsSync(this.metaPath(normalized.jobId))) throw new Error('图片任务已经存在')
    const now = Date.now()
    const job: GeneratedImageJob = {
      format: 0, id: normalized.jobId, request: normalized, provider,
      status: 'queued', progress: 0, phase: '等待图片服务', createdAt: now, updatedAt: now,
    }
    this.write(job, true)
    return job
  }

  /** Read one job by opaque id. */
  get(id: string): GeneratedImageJob {
    const path = this.metaPath(id)
    if (!existsSync(path)) throw new Error(`没有找到图片任务 ${JSON.stringify(id)}`)
    try {
      return parseJob(JSON.parse(readFileSync(path, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取图片任务 ${JSON.stringify(path)}`, { cause: error })
    }
  }

  /** Persist an in-flight stage and monotonic progress. */
  progress(id: string, progress: number, phase: string): GeneratedImageJob {
    const current = this.get(id)
    if (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled') return current
    const next: GeneratedImageJob = {
      ...current,
      status: 'running',
      progress: Math.max(current.progress, Math.min(0.98, Math.max(0, progress))),
      phase: phase.trim().slice(0, 200),
      updatedAt: Date.now(),
    }
    this.write(next)
    return next
  }

  /** Atomically save the final image before marking its job complete. */
  complete(id: string, asset: GeneratedImageAsset): GeneratedImageJob {
    if (asset.data.byteLength < 1 || asset.data.byteLength > MAX_IMAGE_BYTES) throw new Error('生成图片大小无效')
    const current = this.get(id)
    mkdirSync(this.root, { recursive: true, mode: 0o700 })
    const path = this.assetPath(id)
    const staging = join(this.root, `.${id}.${process.pid}.${randomUUID()}.image.tmp`)
    try {
      writeFileSync(staging, asset.data, { mode: 0o600 })
      renameSync(staging, path)
    } finally {
      rmSync(staging, { force: true })
    }
    const job: GeneratedImageJob = {
      ...current,
      status: 'completed', progress: 1, phase: '图片已完成', updatedAt: Date.now(),
      image: { mediaType: asset.mediaType, bytes: asset.data.byteLength },
    }
    this.write(job)
    return job
  }

  /** Persist a provider failure without retaining response bodies or credentials. */
  fail(id: string, error: string): GeneratedImageJob {
    const current = this.get(id)
    const job: GeneratedImageJob = {
      ...current,
      status: 'failed', phase: '生成失败', updatedAt: Date.now(), error: error.trim().slice(0, 4_000),
    }
    this.write(job)
    return job
  }

  /** Persist a user cancellation. */
  cancelled(id: string): GeneratedImageJob {
    const current = this.get(id)
    const job: GeneratedImageJob = {
      ...current,
      status: 'cancelled', phase: '已取消', updatedAt: Date.now(),
    }
    this.write(job)
    return job
  }

  /** Read the immutable bytes for one completed job. */
  asset(id: string): GeneratedImageAsset {
    const job = this.get(id)
    if (job.status !== 'completed' || job.image === undefined) throw new Error('图片任务尚未完成')
    const data = new Uint8Array(readFileSync(this.assetPath(id)))
    if (data.byteLength !== job.image.bytes) throw new Error('生成图片字节数发生变化')
    return { data, mediaType: job.image.mediaType }
  }

  private metaPath(id: string): string {
    if (!isImageJobId(id)) throw new Error('图片任务 id 无效')
    return join(this.root, `${id}.json`)
  }

  private assetPath(id: string): string {
    if (!isImageJobId(id)) throw new Error('图片任务 id 无效')
    return join(this.root, `${id}.image`)
  }

  private write(job: GeneratedImageJob, exclusive = false): void {
    const path = this.metaPath(job.id)
    if (exclusive && existsSync(path)) throw new Error('图片任务已经存在')
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    const staging = join(this.root, `.${job.id}.${process.pid}.${randomUUID()}.meta.tmp`)
    try {
      writeFileSync(staging, `${JSON.stringify(job, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      if (exclusive && existsSync(path)) throw new Error('图片任务已经存在')
      renameSync(staging, path)
    } finally {
      rmSync(staging, { force: true })
    }
  }
}
