/**
 * 내 바인더 지점 공유 — 헤더 오른쪽 한 곳(바인더 편집 상세)만 둔다.
 * 기존 웹 API/SSOT 그대로: GET share-status · POST share · DELETE shared/:shareId. 새 API/DB 없음.
 * 공유 상태는 서버 응답이 SSOT(로컬 boolean 없음). 화면 진입·포커스 때마다 다시 읽는다.
 * 공유 범위·권한(같은 GA만, 해제 즉시 차단)은 서버 정책 그대로 — 네이티브에 권한 정책을 두지 않는다.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppText, Badge, Button, IconButton, ModalShell, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { getBinderShareStatus, revokeBinderShare, shareBinderToGa } from '../shared-binders/sharedBindersApi';
import { sharedBinderQueryKeys } from '../shared-binders/queryKeys';
import { binderActionMessage } from './binderMessages';

export const BINDER_SHARE_COPY = {
  a11yOff: '공유',
  a11yOn: '공유 중, 공유 관리',
  title: '지점에 공유하기',
  lead: '공유하면 같은 지점 사용자가 열람하고 자신의 바인더로 가져갈 수 있습니다. 개인정보가 포함된 자료는 공유 전 목록을 확인해 주세요.',
  ack: '포함된 파일 목록을 확인했으며, 고객 개인정보·민감정보가 포함될 수 있음을 이해하고 지점 공유에 동의합니다.',
  sharing: '공유 중',
  sharingLead: '같은 지점 사용자가 이 바인더를 보고 있을 수 있습니다. 공유를 해제하면 즉시 열람이 막힙니다.',
  share: '공유하기',
  revoke: '공유 해제',
  close: '닫기',
  shared: '바인더가 공유되었습니다.',
  revoked: '공유가 해제되었습니다.',
} as const;

type Props = {
  token: string | null;
  binderId: string;
  binderTitle: string;
  fileCount: number;
  onNotice: (message: string) => void;
};

export function BinderShareAction({ token, binderId, binderTitle, fileCount, onNotice }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const statusKey = sharedBinderQueryKeys.shareStatus(binderId);
  const status = useQuery({
    queryKey: statusKey,
    queryFn: () => getBinderShareStatus(token, binderId),
    enabled: Boolean(token && binderId),
    staleTime: 0,
  });
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void status.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [binderId, token]),
  );

  const active = status.data?.active ?? null;

  const afterChange = async () => {
    await queryClient.invalidateQueries({ queryKey: statusKey });
    await queryClient.invalidateQueries({ queryKey: sharedBinderQueryKeys.list() });
  };

  const run = async (kind: 'share' | 'revoke') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'share') {
        queryClient.setQueryData(statusKey, await shareBinderToGa(token, binderId));
      } else if (active) {
        await revokeBinderShare(token, active.shareId);
        queryClient.setQueryData(statusKey, { active: null });
      }
      await afterChange();
      setOpen(false);
      setAck(false);
      onNotice(kind === 'share' ? BINDER_SHARE_COPY.shared : BINDER_SHARE_COPY.revoked);
    } catch (reason) {
      setError(binderActionMessage(reason, kind === 'share' ? '공유에 실패했습니다.' : '공유 해제에 실패했습니다.'));
      await afterChange();
    } finally {
      setBusy(false);
    }
  };

  const openDialog = () => {
    setError('');
    setAck(false);
    setOpen(true);
    void status.refetch();
  };

  return (
    <>
      <IconButton
        size="md"
        variant="ghost"
        tone={active ? 'primary' : 'default'}
        accessibilityLabel={active ? BINDER_SHARE_COPY.a11yOn : BINDER_SHARE_COPY.a11yOff}
        accessibilityState={{ selected: Boolean(active), disabled: status.isLoading }}
        disabled={status.isLoading}
        onPress={openDialog}
        testID="binder-share-action"
        icon={(color) => (
          <AppText accessibilityElementsHidden importantForAccessibility="no" style={[styles.icon, { color }]}>↗</AppText>
        )}
      />
      <ModalShell
        open={open}
        title={active ? BINDER_SHARE_COPY.sharing : BINDER_SHARE_COPY.title}
        subtitle={binderTitle}
        presentation="dialog"
        busy={busy}
        closeOnBackdrop={false}
        onRequestClose={() => { if (!busy) setOpen(false); }}
        footer={
          <View style={styles.footer}>
            <Button label={BINDER_SHARE_COPY.close} variant="secondary" disabled={busy} onPress={() => setOpen(false)} />
            {active ? (
              <Button label={BINDER_SHARE_COPY.revoke} variant="danger" loading={busy} onPress={() => void run('revoke')} />
            ) : (
              <Button label={BINDER_SHARE_COPY.share} loading={busy} disabled={!ack || status.isFetching} onPress={() => void run('share')} />
            )}
          </View>
        }
      >
        <Stack gap="sm">
          {active ? (
            <>
              <Badge label={BINDER_SHARE_COPY.sharing} tone="success" />
              <AppText>{BINDER_SHARE_COPY.sharingLead}</AppText>
            </>
          ) : (
            <>
              <AppText>{BINDER_SHARE_COPY.lead}</AppText>
              <AppText color="textMuted">{`공유 범위: 현재 소속 GA 지점 · 자료 ${fileCount}개`}</AppText>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ack }}
                accessibilityLabel={BINDER_SHARE_COPY.ack}
                onPress={() => setAck((value) => !value)}
                style={styles.ackRow}
              >
                <AppText style={styles.box}>{ack ? '☑' : '☐'}</AppText>
                <AppText style={styles.ackText}>{BINDER_SHARE_COPY.ack}</AppText>
              </Pressable>
            </>
          )}
          {error ? <AppText color="danger">{error}</AppText> : null}
        </Stack>
      </ModalShell>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    icon: { fontSize: 20, lineHeight: 24 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
    ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, minHeight: theme.interaction.minimumTouchTarget },
    box: { fontSize: 20, lineHeight: 24 },
    ackText: { flex: 1 },
  });
}
