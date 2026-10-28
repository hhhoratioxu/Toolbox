/** Main-process-only extension contract. No provider is loaded and no network is used in v0.1. */
export interface CompanionProfile { name: string; personality: string; locale: string }
export interface CompanionReply { text: string; expression: 'happy' | 'touch' | 'idle' | 'sleep' }
export interface CompanionProvider {
  reply(message: string, profile: CompanionProfile, signal: AbortSignal): Promise<CompanionReply>
}
export class OfflineCompanion implements CompanionProvider {
  async reply(_message: string, profile: CompanionProfile, signal: AbortSignal): Promise<CompanionReply> {
    signal.throwIfAborted()
    return { text: profile.locale === 'en' ? `${profile.name} is happy to keep you company.` : `${profile.name} 正在安静地陪着你。`, expression: 'happy' }
  }
}
// Future providers belong here, behind a main-process vault using Electron safeStorage.
// Never expose credentials or arbitrary endpoint/HTTP/file IPC to a renderer.
