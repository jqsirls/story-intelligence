// Minimal shims to satisfy runtime imports and broaden types without changing behavior.

declare module '@alexa-multi-agent/shared-types' {
  export const DEFAULT_IMAGE_MODEL: string
  export interface IPDispute {}
  export interface SavedCharacter {
    referenceImages?: any[]
    bodyshotUrl?: string
    [key: string]: any
  }
}

declare module './services/AnimationService' {
  export interface AnimationRequest {
    [key: string]: any
    userId?: string
  }
  export class AnimationService {
    constructor(...args: any[])
    generateAnimatedCover(request: AnimationRequest): Promise<any>
    static TierRestrictionError?: new (...args: any[]) => Error
  }
  export class TierRestrictionError extends Error {
    upgradeMessage?: string
    tier?: string
  }
}

declare module '@aws-sdk/client-sqs'
declare module 'jimp'
declare type Jimp = any

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(client: any, command: any, options?: any): Promise<string>
}

// Trait shape extension used in image safety checks
declare global {
  interface InclusivityTrait {
    appliesToHeadshot?: boolean
    appliesToBodyshot?: boolean
    [key: string]: any
  }
}

export {}

