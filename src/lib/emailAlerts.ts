import type { DropOffLocation } from '@/components/dropOffLocations'

interface EmailRecipient {
  name: string
  email?: string | null
}

interface ListingSummary {
  id: string
  title: string
  category: string
  description: string
  fulfillmentMethod: 'pickup' | 'dropoff' | ''
  dropOffLocation?: DropOffLocation | null
}

export interface EmailOutboxEntry {
  id: string
  to: string
  subject: string
  body: string
  sentAt: string
  context: {
    listingId: string
    fulfillmentMethod: ListingSummary['fulfillmentMethod']
  }
}

const formatListingDetails = (listing: ListingSummary) => {
  const base = `Listing: ${listing.title}\nCategory: ${listing.category}\nDetails: ${listing.description}`

  if (listing.fulfillmentMethod === 'dropoff' && listing.dropOffLocation) {
    return `${base}\nDrop-off partner: ${listing.dropOffLocation.name}\nAddress: ${listing.dropOffLocation.address}`
  }

  return `${base}\nFulfilment: Community pick-up`
}

const buildEmailBody = (recipient: EmailRecipient, listing: ListingSummary) => {
  const greeting = recipient.name ? `Hi ${recipient.name.split(' ')[0]},` : 'Hello,'
  const summary = formatListingDetails(listing)

  return [
    greeting,
    '',
    'Thanks for supporting a TruCycle exchange. Here are the details of the new listing:',
    '',
    summary,
    '',
    'You can view and manage the listing from your TruCycle dashboard.',
    '',
    '— The TruCycle Team'
  ].join('\n')
}

const createEmailEntry = (recipient: EmailRecipient, listing: ListingSummary): EmailOutboxEntry | null => {
  if (!recipient.email) {
    return null
  }

  return {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to: recipient.email,
    subject: `TruCycle listing confirmed: ${listing.title}`,
    body: buildEmailBody(recipient, listing),
    sentAt: new Date().toISOString(),
    context: {
      listingId: listing.id,
      fulfillmentMethod: listing.fulfillmentMethod
    }
  }
}

export const sendListingSubmissionEmails = async (
  donor: EmailRecipient,
  partnerLocation: DropOffLocation | null,
  listing: ListingSummary
): Promise<EmailOutboxEntry[]> => {
  const outboxEntries: EmailOutboxEntry[] = []

  const donorEmail = createEmailEntry(donor, listing)
  if (donorEmail) {
    outboxEntries.push(donorEmail)
  }

  if (partnerLocation) {
    const partnerEmail = createEmailEntry(
      {
        name: partnerLocation.name,
        email: partnerLocation.contactEmail ?? null
      },
      listing
    )

    if (partnerEmail) {
      outboxEntries.push(partnerEmail)
    }
  }

  if (outboxEntries.length === 0) {
    return []
  }

  try {
    const existing = (await spark.kv.get('email-outbox')) ?? []
    await spark.kv.set('email-outbox', [...existing, ...outboxEntries])
  } catch (error) {
    console.error('Failed to log email alerts', error)
  }

  return outboxEntries
}
