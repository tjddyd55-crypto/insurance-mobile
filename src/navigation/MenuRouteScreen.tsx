import { View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { PlaceholderScreen } from '../features/placeholder/PlaceholderScreen';
import { LegacyWebScreen } from '../features/legacy/LegacyWebScreen';
import type { MenuImplementationMode } from './menuConfig';

type Props = {
  title: string;
  legacyWebPath: string;
  nativePath: string;
  mode?: MenuImplementationMode;
  status?: string;
};

export function MenuRouteScreen({
  title,
  legacyWebPath,
  nativePath,
  mode = 'NATIVE',
  status = 'NOT_STARTED',
}: Props) {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={title} />
      {mode === 'WEBVIEW_TEMP' ? (
        <LegacyWebScreen title={title} legacyWebPath={legacyWebPath} />
      ) : (
        <PlaceholderScreen
          title={title}
          legacyWebPath={legacyWebPath}
          nativePath={nativePath}
          mode={mode}
          status={status}
        />
      )}
    </View>
  );
}
