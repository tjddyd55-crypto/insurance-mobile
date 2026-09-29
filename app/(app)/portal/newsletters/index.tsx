import { useLocalSearchParams } from 'expo-router';

import { NewslettersScreen } from '../../../../src/features/newsletters/NewslettersScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ newsletterId?: string; channel?: string }>();
  const newsletterId = String(params.newsletterId ?? '').trim();
  const channel = String(params.channel ?? 'INSURER').trim().toUpperCase();
  return (
    <NewslettersScreen
      channel={channel === 'LOSS_ADJUSTER' ? 'LOSS_ADJUSTER' : 'INSURER'}
      initialNewsletterId={newsletterId || undefined}
    />
  );
}
