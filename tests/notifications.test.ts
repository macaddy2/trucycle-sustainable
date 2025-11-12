import { describe, expect, it } from 'vitest'
import type { NotificationViewModel } from '@/lib/api/types'
import { mapServerToUi } from '@/hooks/useNotifications'

describe('mapServerToUi', () => {
  const base: NotificationViewModel = {
    id: 'notif-1',
    type: 'item.claim.request',
    title: 'New claim request',
    body: 'A collector is interested',
    data: null,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  }

  it('normalizes claim metadata fields', () => {
    const notification = mapServerToUi({
      ...base,
      data: {
        itemId: 'item-123',
        claimId: 'claim-456',
        requesterId: 'user-789',
        requesterName: 'Casey Collector',
        requesterAvatar: 'https://cdn/avatar.png',
      },
    })

    expect(notification.metadata).toMatchObject({
      itemId: 'item-123',
      claimId: 'claim-456',
      requesterId: 'user-789',
      requesterName: 'Casey Collector',
      requesterAvatar: 'https://cdn/avatar.png',
      rawType: 'item.claim.request',
    })
  })

  it('extracts nested payload metadata fallback', () => {
    const notification = mapServerToUi({
      ...base,
      data: {
        item: { id: 'nested-item', title: 'Upcycled chair' },
        claim: { id: 'nested-claim', item_id: 'nested-item' },
        collector: { id: 'collector-1', first_name: 'Jamie', last_name: 'Lee' },
      },
    })

    expect(notification.metadata).toMatchObject({
      itemId: 'nested-item',
      itemTitle: 'Upcycled chair',
      claimId: 'nested-claim',
      requesterId: 'collector-1',
      requesterName: 'Jamie Lee',
    })
  })
})
