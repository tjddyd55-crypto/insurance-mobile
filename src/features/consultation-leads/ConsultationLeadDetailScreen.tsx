import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Badge, Button, Card, Inline, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { notificationQueryKeys } from '../notifications/queryKeys';
import {
  consultationChannelLabel,
  consultationLeadStatusLabel,
  formatLeadDateTime,
  formatLeadPhone,
  leadDialUrl,
  leadStatusActions,
  normalizeConsultationLeadId,
} from './consultationLeadModel';
import { getConsultationLead, updateConsultationLeadStatus } from './consultationLeadsApi';
import { leadStatusTone } from './ConsultationLeadsScreen';
import { consultationLeadQueryKeys } from './queryKeys';
import type { ConsultationLead, ConsultationLeadStatus } from './types';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <AppText variant="caption" color="textMuted">{label}</AppText>
      <AppText variant="body" selectable>{value}</AppText>
    </Stack>
  );
}

/** 상담 신청 상세. 전화·문자는 OS 앱, 상태는 확인/완료만 바꾼다. 고객을 만들지 않는다. */
export function ConsultationLeadDetailScreen({ leadId: rawLeadId }: { leadId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const leadId = normalizeConsultationLeadId(rawLeadId);
  const query = useQuery({
    queryKey: consultationLeadQueryKeys.detail(leadId ?? ''),
    queryFn: () => getConsultationLead(token, leadId ?? ''),
    enabled: Boolean(token && leadId),
  });
  const mutation = useMutation({
    mutationFn: (status: ConsultationLeadStatus) => updateConsultationLeadStatus(token, leadId ?? '', status),
    onSuccess: async (lead: ConsultationLead) => {
      queryClient.setQueryData(consultationLeadQueryKeys.detail(lead.id), lead);
      await queryClient.invalidateQueries({ queryKey: consultationLeadQueryKeys.list() });
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/consultation-leads'));
  const header = <AppHeader title="상담 신청 상세" showBack showMenu={false} onBackPress={back} />;

  if (!leadId) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState title="상담 신청을 찾을 수 없습니다" message="잘못된 상담 신청 주소입니다." />
      </View>
    );
  }
  if (query.isLoading) {
    return <View style={styles.root}>{header}<LoadingState message="상담 신청을 불러오는 중…" /></View>;
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState
          title="상담 신청을 불러오지 못했습니다"
          message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')}
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const lead = query.data;
  const tel = leadDialUrl(lead, 'tel');
  const sms = leadDialUrl(lead, 'sms');
  const actions = leadStatusActions(lead.status);
  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.body}>
        <Card variant="outlined" padding="md">
          <Stack gap="md">
            <Inline justify="space-between">
              <AppText variant="cardTitle">{lead.visitorName || '이름 없음'}</AppText>
              <Badge label={consultationLeadStatusLabel(lead.status)} tone={leadStatusTone(lead.status)} />
            </Inline>
            <Fact label="접수일시" value={formatLeadDateTime(lead.createdAt)} />
            <Fact label="연락처" value={formatLeadPhone(lead)} />
            <Fact label="연락 희망" value={consultationChannelLabel(lead.contactChannel)} />
            <Fact label="문의 내용" value={lead.message || '—'} />
            <Fact label="개인정보 동의" value={lead.privacyConsent ? `동의함 · ${formatLeadDateTime(lead.privacyConsentAt)}` : '—'} />
          </Stack>
        </Card>
        <Stack gap="sm">
          <Inline gap="sm">
            <View style={styles.flex}>
              <Button label="전화하기" fullWidth disabled={!tel} onPress={() => tel && void Linking.openURL(tel).catch(() => undefined)} />
            </View>
            <View style={styles.flex}>
              <Button label="문자하기" variant="secondary" fullWidth disabled={!sms} onPress={() => sms && void Linking.openURL(sms).catch(() => undefined)} />
            </View>
          </Inline>
          <Inline gap="sm">
            <View style={styles.flex}>
              <Button
                label="확인 처리"
                variant="secondary"
                fullWidth
                disabled={!actions.check || mutation.isPending}
                loading={mutation.isPending && mutation.variables === 'checked'}
                onPress={() => mutation.mutate('checked')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label="완료 처리"
                variant="secondary"
                fullWidth
                disabled={!actions.complete || mutation.isPending}
                loading={mutation.isPending && mutation.variables === 'completed'}
                onPress={() => mutation.mutate('completed')}
              />
            </View>
          </Inline>
          {mutation.isError ? (
            <AppText variant="caption" color="danger" align="center">
              {describeApiError(mutation.error, '상태 변경에 실패했습니다.')}
            </AppText>
          ) : null}
        </Stack>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    body: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    flex: { flex: 1 },
  });
}
