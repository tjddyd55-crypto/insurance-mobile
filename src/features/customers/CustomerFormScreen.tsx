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
import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  customerToForm,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormState,
} from './customerForm';
import { createCustomer, getCustomer, updateCustomer } from './customersApi';
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
    const next = customerToForm(customerQuery.data);
    setForm(next);
    setInitialSnapshot(JSON.stringify(next));
    setInitialized(true);
  }, [customerQuery.data, initialized, mode]);

  const dirty = initialized && JSON.stringify(form) !== initialSnapshot;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = customerFormToPayload(form, customerQuery.data);
      return mode === 'create'
        ? createCustomer(token, payload)
        : updateCustomer(token, customerId, payload);
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
            value={form.gender}
            options={[
              { value: '', label: '미선택' },
              { value: 'male', label: '남' },
              { value: 'female', label: '여' },
            ]}
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
          <TextField label="직업" value={form.job} onChangeText={(value) => updateField('job', value)} />
          <TextField
            label="주소"
            value={form.address}
            onChangeText={(value) => updateField('address', value)}
          />
          <TextField
            label="유입 경로"
            value={form.inflowSource}
            onChangeText={(value) => updateField('inflowSource', value)}
          />
          <TextField
            label="소개자·이관자"
            value={form.referrerName}
            onChangeText={(value) => updateField('referrerName', value)}
          />
          <Inline>
            <Button
              label={form.isFavorite ? '★ 중요 고객' : '☆ 일반 고객'}
              variant={form.isFavorite ? 'primary' : 'secondary'}
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
          <TextField
            label="차종"
            value={form.carType}
            onChangeText={(value) => updateField('carType', value)}
          />
          <TextField
            label="차량번호"
            value={form.carNumber}
            onChangeText={(value) => updateField('carNumber', value)}
          />
          <TextField
            label="차량 모델"
            value={form.carModel}
            onChangeText={(value) => updateField('carModel', value)}
          />
          <TextField
            label="연식"
            value={form.carYear}
            error={errors.carYear}
            onChangeText={(value) => updateField('carYear', value)}
            keyboardType="number-pad"
            placeholder="2026"
          />
          <TextField
            label="갱신 예정일"
            value={form.renewalDate}
            error={errors.renewalDate}
            onChangeText={(value) => updateField('renewalDate', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
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

function SegmentedChoice({
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
      <Inline>
        {options.map((option) => (
          <Button
            key={option.value || 'empty'}
            label={option.label}
            variant={value === option.value ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onChange(option.value)}
            style={{ flex: 1 }}
          />
        ))}
      </Inline>
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
