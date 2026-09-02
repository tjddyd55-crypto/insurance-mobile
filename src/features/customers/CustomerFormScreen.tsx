import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { AddressSearchField } from '../../components/AddressSearchField';
import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  customerToForm,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormState,
} from './customerForm';
import { CUSTOMER_MOBILE_CARRIER_OPTIONS } from './customerCarrier';
import {
  CUSTOMER_INFLOW_SOURCE_OPTIONS,
  getInflowSourceDetailFieldMeta,
  requiresInflowSourceDetail,
} from './customerInflowSource';
import { CustomerCarsEditor } from './CustomerCarsEditor';
import { loadCustomerCarFormItems, saveCustomerCarsForCustomer } from './customerCarsSave';
import {
  listCustomerSpecialDates,
  saveCustomerSpecialDatesForCustomer,
  type CustomerSpecialDateFormItem,
} from './customerSpecialDatesApi';
import { createCustomer, getCustomer, updateCustomer } from './customersApi';
import { navigateToCustomerDetail } from './customerWorkspaceNavigation';
import {
  CUSTOMER_GENDER_FORM_OPTIONS,
  resolveChoiceButtonVariant,
  resolveSegmentSelectedVariant,
} from './customerFormChoices';
import { customerQueryKeys } from './queryKeys';
import type { ListCustomersResult } from './types';

type CustomerFormScreenProps =
  | { mode: 'create'; customerId?: never }
  | { mode: 'edit'; customerId: number };

export function CustomerFormScreen({ mode, customerId }: CustomerFormScreenProps) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [form, setForm] = useState<CustomerFormState>({ ...EMPTY_CUSTOMER_FORM });
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [initialized, setInitialized] = useState(mode === 'create');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(EMPTY_CUSTOMER_FORM));

  const customerQuery = useQuery({
    queryKey: customerQueryKeys.detail(customerId ?? 0),
    queryFn: () => getCustomer(token, customerId ?? 0),
    enabled: mode === 'edit' && Boolean(token) && Number.isInteger(customerId) && customerId > 0,
  });

  useEffect(() => {
    if (mode !== 'edit' || !customerQuery.data || initialized) return;
    void (async () => {
      const next = customerToForm(customerQuery.data);
      const [cars, specialDates] = await Promise.all([
        loadCustomerCarFormItems(token, customerQuery.data.id, next.cars),
        listCustomerSpecialDates(token, customerQuery.data.id),
      ]);
      const hydrated: CustomerFormState = {
        ...next,
        cars,
        specialDates: specialDates.map((item) => ({
          id: item.id,
          purposeType: item.purposeType,
          title: item.title,
          dateValue: item.dateValue,
          memo: item.memo,
        })),
      };
      setForm(hydrated);
      setInitialSnapshot(JSON.stringify(hydrated));
      setInitialized(true);
    })();
  }, [customerQuery.data, initialized, mode, token]);

  const dirty = initialized && JSON.stringify(form) !== initialSnapshot;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = customerFormToPayload(form, customerQuery.data);
      const saved =
        mode === 'create'
          ? await createCustomer(token, payload)
          : await updateCustomer(token, customerId, payload);
      await saveCustomerCarsForCustomer({
        token,
        customerId: saved.id,
        formCars: form.cars,
      });
      await saveCustomerSpecialDatesForCustomer({
        token,
        customerId: saved.id,
        formItems: form.specialDates,
      });
      return saved;
    },
    onSuccess: (saved) => {
      setInitialSnapshot(JSON.stringify(form));
      queryClient.setQueryData(customerQueryKeys.detail(saved.id), saved);
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) => {
        if (!previous) return previous;
        const exists = previous.customers.some((customer) => customer.id === saved.id);
        return {
          total: exists ? previous.total : previous.total + 1,
          customers: exists
            ? previous.customers.map((customer) => (customer.id === saved.id ? saved : customer))
            : [saved, ...previous.customers],
        };
      });
      router.replace({ pathname: '/customers/[customerId]', params: { customerId: String(saved.id) } });
    },
  });

  const requestBack = () => {
    if (dirty && !saveMutation.isPending) {
      setDiscardOpen(true);
      return;
    }
    if (mode === 'edit' && customerId) {
      navigateToCustomerDetail(router, customerId);
      return;
    }
    router.back();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestBack();
      return true;
    });
    return () => subscription.remove();
  });

  const updateField = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) {
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  };

  const submit = () => {
    const nextErrors = validateCustomerForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveMutation.mutate();
  };

  if (mode === 'edit' && customerQuery.isLoading) {
    return <LoadingState message="고객 정보를 불러오는 중…" />;
  }
  if (mode === 'edit' && (customerQuery.isError || !customerQuery.data)) {
    return (
      <ErrorState
        title="고객 정보를 불러오지 못했습니다"
        message={customerQuery.error instanceof Error ? customerQuery.error.message : '고객을 찾을 수 없습니다.'}
        onRetry={() => void customerQuery.refetch()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={mode === 'create' ? '고객 등록' : '고객 정보 수정'}
        showMenu={false}
        showBack
        onBackPress={requestBack}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection title="기본 정보">
          <TextField
            label="고객명"
            required
            value={form.name}
            error={errors.name}
            onChangeText={(value) => updateField('name', value)}
            autoFocus={mode === 'create'}
          />
          <TextField
            label="연락처"
            value={form.phone}
            error={errors.phone}
            onChangeText={(value) => updateField('phone', value)}
            keyboardType="phone-pad"
            placeholder="01012345678"
          />
          <TextField
            label="주민등록번호"
            value={form.ssn}
            error={errors.ssn}
            onChangeText={(value) => updateField('ssn', value)}
            keyboardType="number-pad"
            placeholder="생년월일 6자리 + 성별번호"
            helperText="민감정보이므로 업무에 필요한 범위에서만 입력해 주세요."
          />
          <SegmentedChoice
            label="성별"
            required
            value={form.gender}
            error={errors.gender}
            options={CUSTOMER_GENDER_FORM_OPTIONS}
            onChange={(value) => updateField('gender', value as CustomerFormState['gender'])}
          />
          <TextField
            label="생년월일"
            value={form.birthDate}
            error={errors.birthDate}
            onChangeText={(value) => updateField('birthDate', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <SelectChoice
            label="통신사"
            value={form.carrier}
            options={CUSTOMER_MOBILE_CARRIER_OPTIONS}
            onChange={(value) => updateField('carrier', value)}
          />
          <Inline>
            <TextField
              label="키(cm)"
              value={form.height}
              onChangeText={(value) => updateField('height', value)}
              keyboardType="number-pad"
              containerStyle={styles.grow}
            />
            <TextField
              label="몸무게(kg)"
              value={form.weight}
              onChangeText={(value) => updateField('weight', value)}
              keyboardType="number-pad"
              containerStyle={styles.grow}
            />
          </Inline>
          <TextField label="직업" value={form.job} onChangeText={(value) => updateField('job', value)} />
          <AddressSearchField
            value={form.address}
            onChange={(address) => updateField('address', address)}
            disabled={saveMutation.isPending}
          />
          <SelectChoice
            label="유입 경로"
            value={form.inflowSource}
            options={CUSTOMER_INFLOW_SOURCE_OPTIONS}
            onChange={(value) => updateField('inflowSource', value)}
          />
          {requiresInflowSourceDetail(form.inflowSource) ? (
            <TextField
              label={getInflowSourceDetailFieldMeta(form.inflowSource)?.label ?? '소개자·이관자'}
              value={form.referrerName}
              onChangeText={(value) => updateField('referrerName', value)}
              placeholder={getInflowSourceDetailFieldMeta(form.inflowSource)?.placeholder}
            />
          ) : null}
          <Inline>
            <Button
              label={form.isFavorite ? '★ 중요 고객' : '☆ 일반 고객'}
              variant={form.isFavorite ? 'selected' : 'secondary'}
              onPress={() => updateField('isFavorite', !form.isFavorite)}
              style={styles.grow}
            />
            <Button
              label={form.smsOptOut ? '문자 수신거부' : '문자 수신허용'}
              variant={form.smsOptOut ? 'danger' : 'secondary'}
              onPress={() => updateField('smsOptOut', !form.smsOptOut)}
              style={styles.grow}
            />
          </Inline>
        </FormSection>

        <FormSection title="차량 정보">
          <SegmentedChoice
            label="운전 여부"
            value={form.driver}
            options={[
              { value: '', label: '미선택' },
              { value: 'yes', label: '운전함' },
              { value: 'no', label: '안 함' },
            ]}
            onChange={(value) => updateField('driver', value as CustomerFormState['driver'])}
          />
          <CustomerCarsEditor
            cars={form.cars}
            onChange={(cars) => updateField('cars', cars)}
            disabled={saveMutation.isPending}
          />
        </FormSection>

        <FormSection title="기념일">
          <CustomerSpecialDatesEditor
            items={form.specialDates}
            onChange={(specialDates) => updateField('specialDates', specialDates)}
            disabled={saveMutation.isPending}
          />
        </FormSection>

        <FormSection title="보험 및 참고사항">
          <TextField
            label="보험가입내역"
            multiline
            value={form.insuranceHistory}
            onChangeText={(value) => updateField('insuranceHistory', value)}
          />
          <TextField
            label="계좌정보"
            multiline
            value={form.accountNumber}
            onChangeText={(value) => updateField('accountNumber', value)}
          />
          <TextField
            label="수술·치료 관련"
            multiline
            value={form.treatmentHistoryNote}
            onChangeText={(value) => updateField('treatmentHistoryNote', value)}
          />
          <TextField
            label="약 복용 관련"
            multiline
            value={form.medicationHistoryNote}
            onChangeText={(value) => updateField('medicationHistoryNote', value)}
          />
        </FormSection>

        {saveMutation.isError ? (
          <AppText color="danger">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : '고객 정보를 저장하지 못했습니다.'}
          </AppText>
        ) : null}
      </ScrollView>

      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={styles.footer}>
          <Button
            label="취소"
            variant="secondary"
            disabled={saveMutation.isPending}
            onPress={requestBack}
            style={styles.grow}
          />
          <Button
            label={mode === 'create' ? '고객 등록' : '변경 저장'}
            loading={saveMutation.isPending}
            onPress={submit}
            style={styles.grow}
          />
        </View>
      </SafeAreaView>

      <ConfirmDialog
        open={discardOpen}
        title="변경사항 닫기"
        message="변경사항이 저장되지 않았습니다. 닫으시겠습니까?"
        confirmLabel="저장하지 않고 닫기"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setInitialSnapshot(JSON.stringify(form));
          if (mode === 'edit' && customerId) {
            navigateToCustomerDetail(router, customerId);
            return;
          }
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <Stack gap="lg">
        <AppText variant="heading">{title}</AppText>
        {children}
      </Stack>
    </Card>
  );
}

function SelectChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Stack gap="xs">
      <AppText variant="label">{label}</AppText>
      <Inline wrap>
        {options.map((option) => (
          <Button
            key={option.value || 'empty'}
            label={option.label}
            variant={resolveChoiceButtonVariant(option.value, value)}
            size="sm"
            onPress={() => onChange(option.value)}
          />
        ))}
      </Inline>
    </Stack>
  );
}

function CustomerSpecialDatesEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: CustomerSpecialDateFormItem[];
  onChange: (next: CustomerSpecialDateFormItem[]) => void;
  disabled?: boolean;
}) {
  const updateAt = (index: number, next: CustomerSpecialDateFormItem) => {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  };

  return (
    <Stack gap="md">
      <Inline justify="space-between">
        <AppText variant="caption">고객 기념일·안내일을 등록합니다.</AppText>
        <Button
          label="기념일 추가"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onPress={() =>
            onChange([
              ...items,
              {
                purposeType: 'CELEBRATION',
                title: '',
                dateValue: '',
                memo: '',
              },
            ])
          }
        />
      </Inline>
      {!items.length ? (
        <AppText variant="caption" color="textSecondary">
          등록된 기념일이 없습니다.
        </AppText>
      ) : null}
      {items.map((item, index) => (
        <Card key={item.id ?? `special-${index}`} variant="outlined">
          <Stack gap="sm">
            <Inline wrap>
              {(['CELEBRATION', 'THANKS', 'NOTICE', 'CHECKUP'] as const).map((purpose) => (
                <Button
                  key={purpose}
                  label={purpose}
                  size="sm"
                  variant={item.purposeType === purpose ? 'selected' : 'secondary'}
                  onPress={() => updateAt(index, { ...item, purposeType: purpose })}
                />
              ))}
            </Inline>
            <TextField
              label="제목"
              value={item.title}
              onChangeText={(value) => updateAt(index, { ...item, title: value })}
              editable={!disabled}
            />
            <TextField
              label="날짜"
              value={item.dateValue}
              onChangeText={(value) => updateAt(index, { ...item, dateValue: value })}
              placeholder="YYYY-MM-DD"
              editable={!disabled}
            />
            <TextField
              label="메모"
              value={item.memo}
              onChangeText={(value) => updateAt(index, { ...item, memo: value })}
              editable={!disabled}
            />
            <Button
              label="삭제"
              size="sm"
              variant="danger"
              disabled={disabled}
              onPress={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function SegmentedChoice({
  label,
  value,
  options,
  onChange,
  required = false,
  error,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <Stack gap="xs">
      <AppText variant="label">
        {label}
        {required ? ' *' : ''}
      </AppText>
      <Inline>
        {options.map((option) => (
          <Button
            key={option.value || 'empty'}
            label={option.label}
            variant={resolveSegmentSelectedVariant(option.value, value)}
            size="sm"
            onPress={() => onChange(option.value)}
            style={{ flex: 1 }}
          />
        ))}
      </Inline>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
  });
}
