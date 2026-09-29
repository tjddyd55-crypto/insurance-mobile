import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  createTeam,
  disbandTeam,
  getTeamMembers,
  joinTeam,
  kickTeamMember,
  leaveTeam,
  transferTeamLeader,
} from './teamApi';
import { formatStorageBytes } from './teamModel';
import { teamQueryKeys } from './queryKeys';
import type { TeamMember } from './types';

type TeamAction =
  | { type: 'create'; name: string }
  | { type: 'join'; teamId: string }
  | { type: 'kick'; member: TeamMember }
  | { type: 'transfer'; member: TeamMember }
  | { type: 'leave' }
  | { type: 'disband' };

export function TeamMembersScreen() {
  const { token, user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [confirmAction, setConfirmAction] = useState<TeamAction | null>(null);
  const [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => getTeamMembers(token),
    enabled: Boolean(token),
  });
  const actionMutation = useMutation({
    mutationFn: async (action: TeamAction) => {
      switch (action.type) {
        case 'create': return { teamId: await createTeam(token, action.name), message: '팀을 생성했습니다.' };
        case 'join': return { teamId: await joinTeam(token, action.teamId), message: '팀에 연결했습니다.' };
        case 'kick': await kickTeamMember(token, action.member.userId); return { message: '팀원을 강퇴했습니다.' };
        case 'transfer': await transferTeamLeader(token, action.member.userId); return { message: '팀장을 위임했습니다.' };
        case 'leave': await leaveTeam(token); return { teamId: null, message: '팀에서 나갔습니다.' };
        case 'disband': await disbandTeam(token); return { teamId: null, message: '팀을 해체했습니다.' };
      }
    },
    onSuccess: async (result) => {
      if ('teamId' in result) await updateUser({ teamId: result.teamId });
      setConfirmAction(null); setTeamCode(''); setTeamName(''); setMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.members });
    },
  });

  if (query.isLoading) return <LoadingState message="팀 정보를 불러오는 중…" />;
  if (query.isError || !query.data) {
    return <ErrorState title="팀 정보를 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  const isOwner = Boolean(data.ownerId && data.ownerId === user?.id);
  const otherMembers = data.members.filter((member) => member.userId !== data.ownerId);
  const error = actionMutation.error;
  const confirmCopy = resolveConfirmCopy(confirmAction);

  return (
    <View style={styles.root}>
      <AppHeader title="팀원리스트" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        >
          {!data.teamId || data.members.length === 0 ? (
            <>
              <Card variant="outlined">
                <Stack gap="md">
                  <AppText variant="heading">새 팀 만들기</AppText>
                  <AppText variant="caption">팀 이름은 나중에 팀원에게 구분하기 쉽게 표시됩니다.</AppText>
                  <TextField label="팀 이름 (선택)" value={teamName} onChangeText={setTeamName} placeholder="예: 강남1팀" />
                  <Button label="팀 생성" loading={actionMutation.isPending && actionMutation.variables?.type === 'create'} onPress={() => actionMutation.mutate({ type: 'create', name: teamName })} />
                </Stack>
              </Card>
              <Card variant="outlined">
                <Stack gap="md">
                  <AppText variant="heading">기존 팀 연결</AppText>
                  <TextField label="팀 코드" value={teamCode} onChangeText={setTeamCode} autoCapitalize="none" autoCorrect={false} />
                  <Button label="팀 연결" variant="secondary" disabled={!teamCode.trim()} loading={actionMutation.isPending && actionMutation.variables?.type === 'join'} onPress={() => actionMutation.mutate({ type: 'join', teamId: teamCode.trim() })} />
                </Stack>
              </Card>
            </>
          ) : (
            <>
              <Card variant="elevated">
                <Stack gap="md">
                  <Inline justify="space-between" align="flex-start">
                    <View style={styles.teamCopy}><AppText variant="title">{data.teamName || '내 팀'}</AppText><AppText variant="caption">팀 코드 · {data.teamId}</AppText></View>
                    <Badge label={data.teamActive ? '활성' : '비활성'} tone={data.teamActive ? 'success' : 'warning'} />
                  </Inline>
                  {data.teamStorageLimitBytes > 0 ? (
                    <AppText variant="caption">팀 저장공간 {formatStorageBytes(data.teamStorageUsedBytes)} / {formatStorageBytes(data.teamStorageLimitBytes)}</AppText>
                  ) : null}
                </Stack>
              </Card>

              <Stack gap="sm">
                <Inline justify="space-between"><AppText variant="heading">팀원 {data.members.length}명</AppText>{isOwner ? <Badge label="팀장 권한" tone="warning" /> : null}</Inline>
                {data.members.map((member) => {
                  const rowOwner = member.userId === data.ownerId;
                  const me = member.userId === user?.id;
                  return (
                    <Card key={member.userId} variant="outlined">
                      <Stack gap="md">
                        <Inline justify="space-between" align="flex-start">
                          <View style={styles.teamCopy}>
                            <Inline gap="sm" wrap><AppText variant="bodyStrong">{member.displayName || member.username}</AppText>{rowOwner ? <Badge label="★ 팀장" tone="warning" /> : null}{me ? <Badge label="나" tone="info" /> : null}</Inline>
                            <AppText variant="caption">@{member.username} · {member.role}</AppText>
                          </View>
                        </Inline>
                        {isOwner && !rowOwner ? (
                          <Inline><Button label="팀장 위임" size="sm" variant="secondary" onPress={() => setConfirmAction({ type: 'transfer', member })} style={styles.grow} /><Button label="강퇴" size="sm" variant="danger" onPress={() => setConfirmAction({ type: 'kick', member })} style={styles.grow} /></Inline>
                        ) : null}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>

              <Card variant="outlined">
                <Stack gap="md">
                  <AppText variant="heading" color="danger">팀 관리</AppText>
                  {isOwner && otherMembers.length === 0 ? <Button label="팀 해체" variant="danger" onPress={() => setConfirmAction({ type: 'disband' })} /> : null}
                  <Button label={isOwner && otherMembers.length === 0 ? '팀 나가기 (팀 해체)' : '팀 나가기'} variant="secondary" onPress={() => setConfirmAction({ type: 'leave' })} />
                  {isOwner && otherMembers.length > 0 ? <AppText variant="caption">팀장은 다른 팀원에게 팀장을 위임한 뒤 나갈 수 있습니다.</AppText> : null}
                </Stack>
              </Card>
            </>
          )}

          {message ? <AppText color="success">{message}</AppText> : null}
          {error ? <AppText color="danger">{error instanceof Error ? error.message : '팀 요청을 처리하지 못했습니다.'}</AppText> : null}
        </ScrollView>
      </Screen>
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirmLabel}
        tone="danger"
        busy={actionMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) actionMutation.mutate(confirmAction); }}
      />
    </View>
  );
}

function resolveConfirmCopy(action: TeamAction | null) {
  if (action?.type === 'kick') return { title: '팀원 강퇴', message: `${action.member.displayName || action.member.username}님을 강퇴하시겠습니까?`, confirmLabel: '강퇴' };
  if (action?.type === 'transfer') return { title: '팀장 위임', message: `${action.member.displayName || action.member.username}님에게 팀장을 위임하시겠습니까?`, confirmLabel: '위임' };
  if (action?.type === 'disband') return { title: '팀 해체', message: '팀 게시글·첨부·저장 파일이 정리되며 되돌릴 수 없습니다.', confirmLabel: '팀 해체' };
  return { title: '팀 나가기', message: '팀에서 나가시겠습니까?', confirmLabel: '나가기' };
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    teamCopy: { flex: 1, gap: theme.spacing.xs },
    grow: { flex: 1 },
  });
}
