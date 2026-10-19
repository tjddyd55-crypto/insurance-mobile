import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppTheme, type AppTheme } from '../../design-system';
import { usePageImageLink } from './usePageImageLink';
import { viewerThumbRequest, type BinderViewerPageRef, type BinderViewerSource } from './binderPageImage';

type Props = {
  token: string | null;
  source: BinderViewerSource;
  pages: BinderViewerPageRef[];
  selectedPosition: number;
  onSelect: (position: number) => void;
};

export function BinderThumbnailStrip({ token, source, pages, selectedPosition, onSelect }: Props) {
  const theme = useAppTheme();
  const styles = createStripStyles(theme);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {pages.map((page, position) => (
        <PageThumb
          key={page.index}
          token={token}
          source={source}
          page={page}
          selected={position === selectedPosition}
          onPress={() => onSelect(position)}
        />
      ))}
    </ScrollView>
  );
}

function PageThumb({
  token, source, page, selected, onPress,
}: {
  token: string | null;
  source: BinderViewerSource;
  page: BinderViewerPageRef;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStripStyles(theme);
  const request = useMemo(() => viewerThumbRequest(source, page.index), [source, page.index]);
  const { uri } = usePageImageLink(token, request);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${page.index}페이지`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.thumb, selected && styles.selected]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.image} />
      )}
    </Pressable>
  );
}

function createStripStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    thumb: {
      width: 48,
      height: 64,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surfaceSubtle,
    },
    selected: { borderColor: theme.colors.primary },
    image: { width: '100%', height: '100%' },
  });
}
