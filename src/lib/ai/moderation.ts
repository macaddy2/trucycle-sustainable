export type ModerationLabel = 'faulty' | 'defective' | 'great' | 'repairable';

export type ModerationResult = {
  status: 'clear' | 'flagged'
  severity: 'low' | 'medium' | 'high'
  message: string
  labels: ModerationLabel[]
};

const KEYWORDS: Array<{ pattern: RegExp; result: ModerationResult }> = [
  {
    pattern: /broken|cracked|faulty/i,
    result: {
      status: 'flagged',
      severity: 'high',
      message: 'Images appear to show damage that may require specialist recycling.',
      labels: ['faulty', 'defective'],
    },
  },
  {
    pattern: /stain|tear|worn/i,
    result: {
      status: 'flagged',
      severity: 'medium',
      message: 'We detected visible wear. Confirm the item is safe for donation.',
      labels: ['repairable'],
    },
  },
  {
    pattern: /new|sealed|mint/i,
    result: {
      status: 'clear',
      severity: 'low',
      message: 'Looks great! Item quality appears high.',
      labels: ['great'],
    },
  },
];

const DEFAULT_RESULT: ModerationResult = {
  status: 'clear',
  severity: 'low',
  message: 'No issues detected in the uploaded images.',
  labels: ['great'],
};

export async function moderateImages(imageCaptions: string[]): Promise<ModerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const joined = imageCaptions.join(' ');
  const match = KEYWORDS.find((entry) => entry.pattern.test(joined));
  const result = match ? match.result : DEFAULT_RESULT;
  return {
    ...result,
    labels: Array.from(new Set(result.labels)),
  };
}
