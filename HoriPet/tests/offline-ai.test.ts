import { expect, it } from 'vitest'
import { OfflineCompanion } from '../src/main/ai/provider'
it('keeps the optional companion provider entirely local and honors cancellation', async () => {
  const provider = new OfflineCompanion(), controller = new AbortController()
  expect((await provider.reply('hi', { name: 'Mochi', locale: 'en', personality: '' }, controller.signal)).expression).toBe('happy')
  controller.abort()
  await expect(provider.reply('hi', { name: 'Mochi', locale: 'en', personality: '' }, controller.signal)).rejects.toThrow()
})
