import { useEffect, useMemo, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
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
import { getCustomer } from '../customers/customersApi';
import { searchCustomers } from '../customers/customerSearchApi';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import type { CustomerRecord } from '../customers/types';
import { customerValue, orderedInputFields } from './applicationDocumentsModel';
import {
  getPdfIssuance,
  getPdfTemplate,
  listPdfTemplates,
  renderAndSharePdf,
} from './applicationDocumentsApi';
import type { PdfField, PdfTemplate } from './types';

export function ApplicationDocumentsScreen({
  sourceIssuanceId = null,
  initialCustomerId = null,
  showBack = false,
}: {
  sourceIssuanceId?: number | null;
  initialCustomerId?: number | null;
  showBack?: boolean;
} = {}) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PdfTemplate | null>(null);
  const onBackPress = useCustomerDetailBack(initialCustomerId ?? 0);
  const templates = useQuery({
    queryKey: ['pdf-templates'],
    queryFn: () => listPdfTemplates(token),
    enabled: Boolean(token),
  });
  const source = useQuery({
    queryKey: ['pdf-issuance-source', sourceIssuanceId],
    queryFn: () => getPdfIssuance(token, sourceIssuanceId!),
    enabled: Boolean(token && sourceIssuanceId),
  });

  useEffect(() => {
    const templateId = source.data?.issuance.templateId;
    if (!templateId || !templates.data) return;
    const template = templates.data.templates.find((row) => row.id === templateId);
    if (template) setSelected(template);
  }, [source.data, templates.data]);

  const rows = (templates.data?.templates ?? [])
    .filter(
      (row) =>
        !search.trim() ||
        `${row.title} ${row.description}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));

  return (
    <View style={styles.root}>
      <AppHeader
        title="신청서 작성"
        showMenu={!showBack}
        showBack={showBack}
        onBackPress={showBack && initialCustomerId ? onBackPress : undefined}
      />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={templates.isRefetching}
              onRefresh={() => void templates.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Card>
            <Stack gap="md">
              <AppText variant="heading">PDF 신청서</AppText>
              <AppText variant="caption">
                템플릿을 고르고 고객정보를 연결한 뒤 입력하면 PDF를 발급·공유할 수
                있습니다.
              </AppText>
              <TextField
                placeholder="문서 이름 검색"
                value={search}
                onChangeText={setSearch}
              />
              <Button
                label="과거 작성·발급 목록"
                variant="secondary"
                onPress={() => router.push('/application/documents/history')}
              />
            </Stack>
          </Card>
          {source.isLoading ? (
            <Card variant="filled">
              <AppText>과거 입력 내용을 불러오는 중…</AppText>
            </Card>
          ) : null}
          {templates.isError || source.isError ? (
            <ErrorState
              title="신청서 목록을 불러오지 못했습니다"
              message={
                (templates.error ?? source.error) instanceof Error
                  ? ((templates.error ?? source.error)?.message ??
                    '잠시 후 다시 시도해 주세요.')
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() =>
                void Promise.all([
                  templates.refetch(),
                  sourceIssuanceId ? source.refetch() : Promise.resolve(),
                ])
              }
            />
          ) : null}
          {!templates.isLoading && !rows.length ? (
            <Card variant="outlined">
              <AppText color="textSecondary" align="center">
                현재 사용 가능한 문서가 없습니다.
              </AppText>
            </Card>
          ) : null}
          {rows.map((row) => (
            <Card key={row.id} variant="outlined">
              <Stack gap="sm">
                <Inline justify="space-between" align="flex-start">
                  <View style={styles.grow}>
                    <AppText variant="bodyStrong">{row.title}</AppText>
                    <AppText variant="caption">{row.description || '설명 없음'}</AppText>
                  </View>
                  <Badge label={`${row.pageCount}쪽`} tone="info" />
                </Inline>
                <Button
                  label="이 신청서 작성"
                  variant="actionEmphasis"
                  size="sm"
                  onPress={() => setSelected(row)}
                />
              </Stack>
            </Card>
          ))}
        </ScrollView>
      </Screen>
      <PdfFormModal
        template={selected}
        token={token}
        initialCustomerId={initialCustomerId}
        sourceValues={
          source.data?.issuance.templateId === selected?.id
            ? (source.data?.issuance.valuesSnapshot ?? null)
            : null
        }
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function PdfFormModal({
  template,
  token,
  initialCustomerId = null,
  sourceValues,
  onClose,
}: {
  template: PdfTemplate | null;
  token: string | null;
  initialCustomerId?: number | null;
  sourceValues: Record<string, string> | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scoped = Boolean(initialCustomerId);
  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId);
  const [customerQuery, setCustomerQuery] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomerId(initialCustomerId);
    setCustomerQuery('');
  }, [initialCustomerId, template?.id]);

  const detail = useQuery({
    queryKey: ['pdf-template', template?.id],
    queryFn: () => getPdfTemplate(token, template!.id),
    enabled: Boolean(token && template),
  });
  const scopedCustomer = useQuery({
    queryKey: ['customer', initialCustomerId],
    queryFn: () => getCustomer(token, initialCustomerId!),
    enabled: Boolean(token && template && initialCustomerId),
  });
  const searchHits = useQuery({
    queryKey: ['customers', 'pdf-search', customerQuery],
    queryFn: () => searchCustomers(token, customerQuery, { limit: 20 }),
    enabled: Boolean(token && template && !scoped && customerQuery.trim().length >= 1),
  });
  const pickedFromSearch = (searchHits.data ?? []).find((row) => row.id === customerId);
  const customer: CustomerRecord | null =
    scopedCustomer.data ?? pickedFromSearch ?? null;
  const fields = orderedInputFields(detail.data?.fields ?? []);

  useEffect(() => {
    if (!detail.data || !template) return;
    const initial: Record<string, string> = {};
    for (const field of orderedInputFields(detail.data.fields)) {
      initial[field.fieldKey] =
        sourceValues?.[field.fieldKey] ?? customerValue(customer, field);
    }
    setValues(initial);
    setError('');
  }, [customer, detail.data, sourceValues, template]);

  const issue = useMutation({
    mutationFn: async () => {
      if (!template) return;
      const missing = fields.find(
        (field) => field.required && !values[field.fieldKey]?.trim(),
      );
      if (missing) throw new Error(`${missing.label} 항목을 입력해 주세요.`);
      await renderAndSharePdf(token, template, values, customerId);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['pdf-issuances'] });
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'PDF를 발급하지 못했습니다.'),
  });

  return (
    <Modal visible={Boolean(template)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <View style={styles.grow}>
            <AppText variant="heading">{template?.title ?? '신청서 작성'}</AppText>
            <AppText variant="caption">
              필수 항목을 입력한 뒤 PDF를 발급하세요.
            </AppText>
          </View>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="outlined">
            <Stack gap="md">
              <AppText variant="heading">고객 연결</AppText>
              {scoped ? (
                <AppText>
                  {scopedCustomer.isLoading
                    ? '고객 정보를 불러오는 중…'
                    : customer
                      ? `${customer.name} 고객으로 작성합니다.`
                      : '고객 정보를 불러오지 못했습니다.'}
                </AppText>
              ) : (
                <>
                  <TextField
                    label="고객 검색"
                    placeholder="이름 또는 연락처"
                    value={customerQuery}
                    onChangeText={setCustomerQuery}
                    returnKeyType="search"
                  />
                  <Inline wrap>
                    <Button
                      label="고객 미지정"
                      size="sm"
                      variant={!customerId ? 'selected' : 'secondary'}
                      onPress={() => setCustomerId(null)}
                    />
                    {(searchHits.data ?? []).map((row) => (
                      <Button
                        key={row.id}
                        label={row.name}
                        size="sm"
                        variant={customerId === row.id ? 'selected' : 'secondary'}
                        onPress={() => setCustomerId(row.id)}
                      />
                    ))}
                  </Inline>
                  {searchHits.isFetching ? (
                    <AppText variant="caption">검색 중…</AppText>
                  ) : null}
                  {customerQuery.trim() &&
                  !searchHits.isFetching &&
                  !(searchHits.data ?? []).length ? (
                    <AppText variant="caption" color="textSecondary">
                      검색 결과가 없습니다.
                    </AppText>
                  ) : null}
                </>
              )}
              {customer && !scoped ? (
                <AppText variant="caption">
                  {customer.name} 고객 정보로 매핑 필드를 자동 입력했습니다.
                </AppText>
              ) : null}
            </Stack>
          </Card>
          {fields.map((field) => (
            <PdfFieldControl
              key={field.fieldKey}
              field={field}
              value={values[field.fieldKey] ?? ''}
              onChange={(value) =>
                setValues((old) => ({ ...old, [field.fieldKey]: value }))
              }
            />
          ))}
          {error ? <AppText color="danger">{error}</AppText> : null}
          <Card variant="filled">
            <Stack gap="sm">
              <AppText variant="caption">
                발급하면 서버에 보관 이력이 생성되며 운영체제 공유창에서 저장하거나
                전달할 수 있습니다.
              </AppText>
              <Button
                label="PDF 발급 및 공유"
                variant="action"
                fullWidth
                loading={issue.isPending}
                onPress={() => issue.mutate()}
              />
            </Stack>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function PdfFieldControl({
  field,
  value,
  onChange,
}: {
  field: PdfField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.fieldType === 'checkbox' || field.fieldType === 'radio') {
    return (
      <Card variant="outlined">
        <Stack gap="sm">
          <AppText variant="label">
            {field.label}
            {field.required ? ' *' : ''}
          </AppText>
          <Inline wrap>
            {(field.options ?? ['예']).map((option) => (
              <Button
                key={option}
                label={option}
                size="sm"
                variant={value === option ? 'selected' : 'secondary'}
                onPress={() =>
                  onChange(
                    value === option && field.fieldType === 'checkbox' ? '' : option,
                  )
                }
              />
            ))}
          </Inline>
        </Stack>
      </Card>
    );
  }
  return (
    <TextField
      label={field.label}
      required={field.required}
      value={value}
      onChangeText={onChange}
      multiline={field.fieldType === 'textarea'}
      numberOfLines={field.fieldType === 'textarea' ? 4 : 1}
      placeholder={
        field.fieldType === 'signature' ? '서명에 사용할 이름을 입력하세요' : undefined
      }
    />
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    grow: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.huge,
      gap: theme.spacing.md,
    },
    modal: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
      minHeight: 72,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
