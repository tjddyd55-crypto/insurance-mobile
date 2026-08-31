import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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
  Divider,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { customerGenderLabel, formatCustomerPhone } from './customerModel';
import { deleteCustomer, getCustomer, setCustomerFavorite } from './customersApi';
import { customerQueryKeys } from './queryKeys';
import type { ListCustomersResult } from './types';

type CustomerDetailScreenProps = { customerId: number };

function valueOrDash(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').trim();
  return normalized || '—';
}

function phoneUrl(phone: string, scheme: 'tel' | 'sms'): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `${scheme}:${digits}` : null;
}

export function CustomerDetailScreen({ customerId }: CustomerDetailScreenProps) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const queryKey = customerQueryKeys.detail(customerId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = useQuery({
    queryKey,
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token) && Number.isInteger(customerId) && customerId > 0,
  });
  const favoriteMutation = useMutation({
    mutationFn: (isFavorite: boolean) => setCustomerFavorite(token, customerId, isFavorite),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              ...previous,
              customers: previous.customers.map((customer) =>
                customer.id === updated.id ? updated : customer,
              ),
            }
          : previous,
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(token, customerId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey });
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              total: Math.max(0, previous.total - 1),
              customers: previous.customers.filter((item) => item.id !== customerId),
            }
          : previous,
      );
      router.replace('/customers');
    },
  });

  const customer = query.data;
  const telUrl = customer ? phoneUrl(customer.phone, 'tel') : null;
  const smsUrl = customer ? phoneUrl(customer.phone, 'sms') : null;

  return (
    <View style={styles.root}>
      <AppHeader title={customer?.name ?? '고객 상세'} showMenu={false} showBack />
      {query.isLoading ? (
        <LoadingState message="고객 정보를 불러오는 중…" />
      ) : query.isError || !customer ? (
        <ErrorState
          title="고객 정보를 불러오지 못했습니다"
          message={query.error instanceof Error ? query.error.message : '고객을 찾을 수 없습니다.'}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Card>
            <Stack gap="md">
              <Inline justify="space-between" align="flex-start">
                <Stack gap="xs" style={styles.grow}>
                  <Inline wrap>
                    <AppText variant="title">{customer.name}</AppText>
                    {customer.customerCode ? <Badge label={customer.customerCode} /> : null}
                    {customer.isFavorite ? <Badge label="중요 고객" tone="warning" /> : null}
                  </Inline>
                  <AppText variant="caption">
                    {customerGenderLabel(customer.gender)}
                    {customer.insuranceAge != null ? ` · 보험나이 ${customer.insuranceAge}세` : ''}
                  </AppText>
                </Stack>
                <Button
                  label={customer.isFavorite ? '중요 해제' : '중요 고객'}
                  size="sm"
                  variant="secondary"
                  loading={favoriteMutation.isPending}
                  onPress={() => favoriteMutation.mutate(!customer.isFavorite)}
                />
              </Inline>
              <Inline>
                <Button
                  label="전화"
                  fullWidth
                  disabled={!telUrl}
                  onPress={() => telUrl && void Linking.openURL(telUrl)}
                  style={styles.grow}
                />
                <Button
                  label={customer.smsOptOut ? '문자 수신거부' : '문자'}
                  fullWidth
                  variant="secondary"
                  disabled={!smsUrl || customer.smsOptOut}
                  onPress={() => smsUrl && void Linking.openURL(smsUrl)}
                  style={styles.grow}
                />
              </Inline>
              <Inline>
                <Button
                  label="정보 수정"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/customers/[customerId]/edit',
                      params: { customerId: String(customer.id) },
                    })
                  }
                  style={styles.grow}
                />
                <Button
                  label="고객 삭제"
                  variant="danger"
                  onPress={() => setDeleteOpen(true)}
                  style={styles.grow}
                />
              </Inline>
              {deleteMutation.isError ? (
                <AppText variant="caption" color="danger">
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : '고객을 삭제하지 못했습니다.'}
                </AppText>
              ) : null}
            </Stack>
          </Card>

          <DetailSection title="기본 정보">
            <DetailRow label="연락처" value={customer.phone ? formatCustomerPhone(customer.phone) : '—'} />
            <DetailRow label="생년월일" value={valueOrDash(customer.birthDate?.slice(0, 10))} />
            <DetailRow label="직업" value={valueOrDash(customer.job)} />
            <DetailRow label="주소" value={valueOrDash(customer.address)} />
            <DetailRow label="유입 경로" value={valueOrDash(customer.inflowSource)} />
            <DetailRow label="소개자" value={valueOrDash(customer.referrerName)} />
          </DetailSection>

          <DetailSection title="상담 및 후속관리">
            <DetailRow
              label="최근 상담일"
              value={valueOrDash((customer.lastConsultDate ?? customer.lastConsultationAt)?.slice(0, 10))}
            />
            <DetailRow
              label="최근 상담"
              value={valueOrDash(customer.lastConsultationMemo ?? customer.lastConsultationSummary)}
            />
            <DetailRow label="다음 연락일" value={valueOrDash(customer.nextContactDate?.slice(0, 10))} />
            <DetailRow label="후속 상태" value={valueOrDash(customer.followUpStatus)} />
          </DetailSection>

          <DetailSection title="차량 정보">
            <DetailRow label="차량번호" value={valueOrDash(customer.carNumber)} />
            <DetailRow label="차종" value={valueOrDash(customer.carModel || customer.carType)} />
            <DetailRow label="연식" value={valueOrDash(customer.carYear)} />
            <DetailRow label="갱신 예정일" value={valueOrDash(customer.renewalDate?.slice(0, 10))} />
          </DetailSection>

          <DetailSection title="보험 및 참고사항">
            <DetailRow label="보험가입내역" value={valueOrDash(customer.notes.insuranceHistory)} />
            <DetailRow label="계좌정보" value={valueOrDash(customer.notes.accountNumber)} />
            <DetailRow label="수술·치료" value={valueOrDash(customer.notes.treatmentHistoryNote)} />
            <DetailRow label="약 복용" value={valueOrDash(customer.notes.medicationHistoryNote)} />
          </DetailSection>
        </ScrollView>
      )}
      <ConfirmDialog
        open={deleteOpen}
        title="고객 삭제"
        message={`${customer?.name ?? '이 고객'}의 정보와 연결된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <Stack gap="md">
        <AppText variant="heading">{title}</AppText>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="label">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.md },
    grow: { flex: 1 },
  });
}
