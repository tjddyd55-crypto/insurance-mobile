import { useLocalSearchParams } from 'expo-router';

import { NewslettersScreen } from '../../../../src/features/newsletters/NewslettersScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ newsletterId?: string }>();
  const newsletterId = String(params.newsletterId ?? '').trim();
  return (
    <NewslettersScreen
      channel="LOSS_ADJUSTER"
      initialNewsletterId={newsletterId || undefined}
    />
  );
}
