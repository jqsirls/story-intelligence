import { RealContentAgent, FinalizationJobPayload } from '../RealContentAgent'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseFinalizationJobPayload(rawBody: unknown): FinalizationJobPayload {
  const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
  if (!isObject(parsed)) throw new Error('Invalid finalization payload (not an object)')

  const storyId = parsed.storyId
  const userId = parsed.userId
  const sessionId = parsed.sessionId
  const storyVersionHash = parsed.storyVersionHash
  const requiredAssets = parsed.requiredAssets

  if (typeof storyId !== 'string' || !storyId) throw new Error('Invalid finalization payload: storyId')
  if (typeof userId !== 'string' || !userId) throw new Error('Invalid finalization payload: userId')
  if (typeof sessionId !== 'string' || !sessionId) throw new Error('Invalid finalization payload: sessionId')
  if (typeof storyVersionHash !== 'string' || !storyVersionHash) throw new Error('Invalid finalization payload: storyVersionHash')
  if (!isObject(requiredAssets)) throw new Error('Invalid finalization payload: requiredAssets')

  const cover = requiredAssets.cover
  const beats = requiredAssets.beats
  const audio = requiredAssets.audio

  if (typeof cover !== 'boolean') throw new Error('Invalid finalization payload: requiredAssets.cover')
  if (typeof audio !== 'boolean') throw new Error('Invalid finalization payload: requiredAssets.audio')
  if (typeof beats !== 'number' || !Number.isInteger(beats) || beats < 0 || beats > 4) {
    throw new Error('Invalid finalization payload: requiredAssets.beats')
  }

  return {
    storyId,
    userId,
    sessionId,
    storyVersionHash,
    requiredAssets: { cover, beats, audio },
  }
}

export async function runFinalizationJob(agent: RealContentAgent, payload: FinalizationJobPayload): Promise<void> {
  await agent.processFinalizationJob(payload)
}


