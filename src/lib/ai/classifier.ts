export type ListingClassificationInput = {
  title: string
  description: string
  category: string
  condition: string
};

export type ListingClassificationResult = {
  recommendedAction: 'exchange' | 'donate' | 'recycle'
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  highlights: string[]
};

const SAMPLE_RESPONSES: Array<{ predicate: (input: ListingClassificationInput) => boolean; result: ListingClassificationResult }> = [
  {
    predicate: (input) => /laptop|electronics/i.test(`${input.title} ${input.description}`),
    result: {
      recommendedAction: 'exchange',
      confidence: 'high',
      reasoning: 'Electronics in good condition typically retain value and perform well in exchanges.',
      highlights: ['Eligible for free exchange', 'Consider offering bundled accessories'],
    },
  },
  {
    predicate: (input) => /coat|clothing|jacket/i.test(`${input.title} ${input.description}`),
    result: {
      recommendedAction: 'donate',
      confidence: 'medium',
      reasoning: 'Wearable clothing with light usage is most impactful when donated directly.',
      highlights: ['Qualifies for community donation', 'Add size information to improve matches'],
    },
  },
  {
    predicate: (input) => /table|furniture/i.test(`${input.title} ${input.description}`),
    result: {
      recommendedAction: 'exchange',
      confidence: 'medium',
      reasoning: 'Furniture in usable condition is ideal for exchange or reuse.',
      highlights: ['Highlight dimensions for best-fit matches', 'Offer assembly support if possible'],
    },
  },
];

const DEFAULT_RESPONSE: ListingClassificationResult = {
  recommendedAction: 'recycle',
  confidence: 'low',
  reasoning: 'We did not detect a strong match. Consider recycling or providing more detail.',
  highlights: ['Add more description to improve categorisation', 'Check local recycling partners'],
};

export async function classifyListing(input: ListingClassificationInput): Promise<ListingClassificationResult> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const match = SAMPLE_RESPONSES.find((entry) => entry.predicate(input));
  return match ? match.result : DEFAULT_RESPONSE;
}
