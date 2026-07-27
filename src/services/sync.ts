import { v4 as uuid } from 'uuid'
import { query, run } from './db'
import type { SyncQueueItem } from '@/types'

export type SyncEndpoint = {
  pushUrl: string
  pullUrl: string
  apiKey: string
}

let syncConfig: SyncEndpoint | null = null

export function configureSync(config: SyncEndpoint): void {
  syncConfig = config
}

export function getPendingSyncItems(): SyncQueueItem[] {
  return query<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE status = \'pending\' ORDER BY created_at ASC LIMIT 50'
  )
}

export async function processSync(): Promise<{ synced: number; failed: number }> {
  if (!syncConfig) {
    return { synced: 0, failed: 0 }
  }

  const items = getPendingSyncItems()
  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      const response = await fetch(syncConfig.pushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': syncConfig.apiKey,
        },
        body: JSON.stringify({
          table: item.table,
          operation: item.operation,
          recordId: item.recordId,
          payload: JSON.parse(item.payload),
        }),
      })

      if (!response.ok) throw new Error(`Sync failed with status ${response.status}`)

      run('UPDATE sync_queue SET status = \'synced\' WHERE id = ?', [item.id])

      const recordTable = item.table
      run(`UPDATE ${recordTable} SET sync_status = 'synced' WHERE id = ?`, [item.recordId])

      synced++
    } catch (err) {
      failed++
      const retryCount = item.retryCount + 1
      const newStatus = retryCount >= 5 ? 'failed' : 'pending'
      run('UPDATE sync_queue SET status = ?, retry_count = ? WHERE id = ?', [newStatus, retryCount, item.id])
      console.error('[Sync] Failed to sync item:', err)
    }
  }

  return { synced, failed }
}

let syncInterval: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = setInterval(() => {
    processSync().then(result => {
      if (result.synced > 0 || result.failed > 0) {
        console.log(`[Sync] Auto-sync: ${result.synced} synced, ${result.failed} failed`)
      }
    })
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Connection restored — triggering sync')
    processSync()
  })
}
