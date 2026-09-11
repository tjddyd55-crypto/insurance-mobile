import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type KeyboardEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { CustomerUnsavedChangesDialog } from './CustomerUnsavedChangesDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  SelectField,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { AddressSearchField } from '../../components/AddressSearchField';
import { formatAddressForSave, parseAddressFromSave } from './customerAddressSearch';
import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  customerToForm,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormState,
} from './customerForm';
import {
  cloneCustomerFormState,
  createCustomerFormSnapshot,
  decideCloseEdit,
  isCustomerFormDirty,
  shouldEnableCustomerEditSave,
} from './customerFormDraft';
import { CUSTOMER_MOBILE_CARRIER_OPTIONS } from './customerCarrier';
import {
  CUSTOMER_INFLOW_SOURCE_OPTIONS,
  getInflowSourceDetailFieldMeta,
  requiresInflowSourceDetail,
} from './customerInflowSource';
import { CollapsibleFormSection } from './CollapsibleFormSection';
import { CustomerCarsEditor } from './CustomerCarsEditor';
import { CustomerFireInsuranceLocationsEditor } from './CustomerFireInsuranceLocationsEditor';
import { loadCustomerCarFormItems, saveCustomerCarsForCustomer } from './customerCarsSave';
import {
  ensureFireInsuranceLocationFormItems,
  customerFireInsuranceLocationRecordToFormItem,
  listCustomerFireInsuranceLocations,
  saveCustomerFireInsuranceLocationsForCustomer,
} from './customerFireInsuranceLocationsApi';
import {
  listCustomerSpecialDates,
  saveCustomerSpecialDatesForCustomer,
  type CustomerSpecialDateFormItem,
} from './customerSpecialDatesApi';
import { createCustomer, getCustomer, updateCustomer } from './customersApi';
import { navigateToCustomerDetail } from './customerWorkspaceNavigation';
import {
  CUSTOMER_GENDER_FORM_OPTIONS,
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
  const [form, setForm] = useState<CustomerFormState>(() => cloneCustomerFormState(EMPTY_CUSTOMER_FORM));
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [initialized, setInitialized] = useState(mode === 'create');
  const [discardOpen, setDiscardOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setKbHeight(event.endCoordinates.height);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKbHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  /** Immutable original snapshot for this edit session (string). */
  const originalSnapshotRef = useRef<string | null>(
    mode === 'create' ? createCustomerFormSnapshot(EMPTY_CUSTOMER_FORM) : null,
  );
  const originalFormRef = useRef<CustomerFormState | null>(
    mode === 'create' ? cloneCustomerFormState(EMPTY_CUSTOMER_FORM) : null,
  );
  const hydrateEpochRef = useRef(0);

  const customerQuery = useQuery({
    queryKey: customerQueryKeys.detail(customerId ?? 0),
    queryFn: () => getCustomer(token, customerId ?? 0),
    enabled: mode === 'edit' && Boolean(token) && Number.isInteger(customerId) && customerId > 0,
  });

  useEffect(() => {
    if (mode !== 'edit' || !customerQuery.data || initialized) return;
    const epoch = ++hydrateEpochRef.current;
    let cancelled = false;
    const customer = customerQuery.data;
    void (async () => {
      const next = customerToForm(customer);
      let cars = next.cars;
      let specialDates: CustomerSpecialDateFormItem[] = [];
      let fireLocationsRaw: Awaited<
        ReturnType<typeof listCustomerFireInsuranceLocations>
      > = [];
      try {
        const loaded = await Promise.all([
          loadCustomerCarFormItems(token, customer.id, next.cars),
          listCustomerSpecialDates(token, customer.id),
          listCustomerFireInsuranceLocations(token, customer.id),
        ]);
        cars = loaded[0];
        specialDates = loaded[1].map((item) => ({
          id: item.id,
          purposeType: item.purposeType,
          title: item.title,
          dateValue: item.dateValue,
          memo: item.memo,
        }));
        fireLocationsRaw = loaded[2];
      } catch {
        // Secondary collections failed — still hydrate core customer fields so edit session can start.
        specialDates = [];
        fireLocationsRaw = [];
      }
      if (cancelled || epoch !== hydrateEpochRef.current) return;
      const hydrated: CustomerFormState = cloneCustomerFormState({
        ...next,
        cars,
        specialDates,
        fireInsuranceLocations: ensureFireInsuranceLocationFormItems(
          fireLocationsRaw.map(customerFireInsuranceLocationRecordToFormItem),
        ),
      });
      // Separate clones: original stays immutable; draft is editable.
      originalFormRef.current = cloneCustomerFormState(hydrated);
      originalSnapshotRef.current = createCustomerFormSnapshot(hydrated);
      setForm(cloneCustomerFormState(hydrated));
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerQuery.data, initialized, mode, token]);

  const dirty =
    initialized && isCustomerFormDirty(form, originalSnapshotRef.current);

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
      await saveCustomerFireInsuranceLocationsForCustomer({
        token,
        customerId: saved.id,
        formItems: form.fireInsuranceLocations,
      });
      await saveCustomerSpecialDatesForCustomer({
        token,
        customerId: saved.id,
        formItems: form.specialDates,
      });
      return saved;
    },
    onSuccess: (saved) => {
      originalFormRef.current = cloneCustomerFormState(form);
      originalSnapshotRef.current = createCustomerFormSnapshot(form);
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

  const leaveWithoutSave = useCallback(() => {
    if (mode === 'edit' && customerId) {
      // Ensure detail re-reads server/cache original — never treat draft as persisted.
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.detail(customerId) });
      navigateToCustomerDetail(router, customerId);
      return;
    }
    router.back();
  }, [customerId, mode, queryClient, router]);

  const discardDraftAndLeave = useCallback(() => {
    if (originalFormRef.current) {
      setForm(cloneCustomerFormState(originalFormRef.current));
    }
    setDiscardOpen(false);
    leaveWithoutSave();
  }, [leaveWithoutSave]);

  const attemptCloseEdit = useCallback(() => {
    const decision = decideCloseEdit({
      dirty,
      saving: saveMutation.isPending,
    });
    if (decision === 'block') return;
    if (decision === 'confirm') {
      setDiscardOpen(true);
      return;
    }
    leaveWithoutSave();
  }, [dirty, leaveWithoutSave, saveMutation.isPending]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        attemptCloseEdit();
        return true;
      });
      return () => subscription.remove();
    }, [attemptCloseEdit]),
  );

  const updateField = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) {
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  };

  const submit = () => {
    if (mode === 'edit' && !initialized) return;
    const nextErrors = validateCustomerForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveMutation.mutate();
  };

  if (mode === 'edit' && (customerQuery.isLoading || !initialized)) {
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
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <AppHeader
        title={mode === 'create' ? '고객 등록' : '고객 정보 수정'}
        showMenu={false}
        showBack
        onBackPress={attemptCloseEdit}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, kbHeight > 0 ? { paddingBottom: theme.spacing.xl + theme.spacing.xl + kbHeight } : null]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
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
            format="phone"
            onChangeText={(value) => updateField('phone', value)}
            keyboardType="phone-pad"
            placeholder="010-1234-5678"
          />
          <TextField
            label="주민등록번호"
            value={form.ssn}
            error={errors.ssn}
            format="residentNumber"
            onChangeText={(value) => updateField('ssn', value)}
            keyboardType="number-pad"
            placeholder="900101-1234567"
            helperText="민감정보이므로 업무에 필요한 범위에서만 입력해 주세요."
            autoComplete="off"
            textContentType="none"
          />
          <SegmentedChoice
            label="성별"
            required
            value={form.gender}
            error={errors.gender}
            options={CUSTOMER_GENDER_FORM_OPTIONS}
            onChange={(value) => updateField('gender', value as CustomerFormState['gender'])}
          />
          <SelectField
            label="통신사"
            value={form.carrier}
            options={CUSTOMER_MOBILE_CARRIER_OPTIONS}
            placeholder="통신사를 선택해 주세요"
            onChange={(value) => updateField('carrier', value)}
            testID="customer-form-carrier-select"
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
          <SegmentedChoice
            label="운전 여부"
            required
            value={form.driver}
            error={errors.driver}
            options={[
              { value: 'yes', label: '운전함' },
              { value: 'no', label: '운전안함' },
            ]}
            onChange={(value) => updateField('driver', value as CustomerFormState['driver'])}
          />
          <AddressSearchField
            value={form.address}
            onChange={(address) => updateField('address', address)}
            disabled={saveMutation.isPending}
          />
          <SelectField
            label="유입 경로"
            value={form.inflowSource}
            options={CUSTOMER_INFLOW_SOURCE_OPTIONS}
            placeholder="유입 경로를 선택해 주세요"
            onChange={(value) => updateField('inflowSource', value)}
            testID="customer-form-inflow-select"
          />
          {requiresInflowSourceDetail(form.inflowSource) ? (
            <TextField
              label={getInflowSourceDetailFieldMeta(form.inflowSource)?.label ?? '소개자·이관자'}
              value={form.referrerName}
              onChangeText={(value) => updateField('referrerName', value)}
              placeholder={getInflowSourceDetailFieldMeta(form.inflowSource)?.placeholder}
            />
          ) : null}
          <Inline align="center" justify="space-between" style={styles.toggleRow}>
            <AppText variant="label">중요 고객</AppText>
            <Switch
              accessibilityLabel="중요 고객"
              value={form.isFavorite}
              onValueChange={(value) => updateField('isFavorite', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primarySoft,
              }}
              thumbColor={form.isFavorite ? theme.colors.primary : theme.colors.surface}
            />
          </Inline>
          <Inline align="center" justify="space-between" style={styles.toggleRow}>
            <AppText variant="label">문자 수신거부</AppText>
            <Switch
              accessibilityLabel="문자 수신거부"
              value={form.smsOptOut}
              onValueChange={(value) => updateField('smsOptOut', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.dangerSoft,
              }}
              thumbColor={form.smsOptOut ? theme.colors.danger : theme.colors.surface}
            />
          </Inline>
        </FormSection>

        <CollapsibleFormSection title="자동차 정보" sectionId="car" testID="customer-form-section-vehicle">
          <CustomerCarsEditor
            cars={form.cars}
            onChange={(cars) => updateField('cars', cars)}
            disabled={saveMutation.isPending}
          />
        </CollapsibleFormSection>

        <CollapsibleFormSection title="사업자 정보" sectionId="business" testID="customer-form-section-business">
          <TextField
            label="대표자명"
            value={form.businessInfo.representativeName}
            editable={!saveMutation.isPending}
            onChangeText={(value) =>
              setForm((previous) => ({
                ...previous,
                businessInfo: { ...previous.businessInfo, representativeName: value },
              }))
            }
          />
          <TextField
            label="사업자번호"
            value={form.businessInfo.businessNumber}
            editable={!saveMutation.isPending}
            onChangeText={(value) =>
              setForm((previous) => ({
                ...previous,
                businessInfo: { ...previous.businessInfo, businessNumber: value },
              }))
            }
          />
          <AddressSearchField
            value={parseAddressFromSave(form.businessInfo.businessAddress)}
            onChange={(address) =>
              setForm((previous) => ({
                ...previous,
                businessInfo: {
                  ...previous.businessInfo,
                  businessAddress: formatAddressForSave(address),
                },
              }))
            }
            disabled={saveMutation.isPending}
          />
          <TextField
            label="메모"
            multiline
            value={form.businessInfo.memo}
            editable={!saveMutation.isPending}
            onChangeText={(value) =>
              setForm((previous) => ({
                ...previous,
                businessInfo: { ...previous.businessInfo, memo: value },
              }))
            }
          />
        </CollapsibleFormSection>

        <CollapsibleFormSection title="화재보험 정보" sectionId="fire" testID="customer-form-section-fire-insurance">
          <CustomerFireInsuranceLocationsEditor
            items={form.fireInsuranceLocations}
            onChange={(fireInsuranceLocations) =>
              updateField('fireInsuranceLocations', fireInsuranceLocations)
            }
            disabled={saveMutation.isPending}
          />
        </CollapsibleFormSection>

        <FormSection title="기념일">
          <CustomerSpecialDatesEditor
            items={form.specialDates}
            onChange={(specialDates) => updateField('specialDates', specialDates)}
            disabled={saveMutation.isPending}
          />
        </FormSection>

        <FormSection title="보험 및 참고사항">
          <TextField
            label="수술·치료 관련"
            multiline
            value={form.treatmentHistoryNote}
            onChangeText={(value) => updateField('treatmentHistoryNote', value)}
            onFocus={() => {
              // Keep bottom fields (esp. 계좌정보) visible above Android keyboard.
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
          />
          <TextField
            label="약 복용 관련"
            multiline
            value={form.medicationHistoryNote}
            onChangeText={(value) => updateField('medicationHistoryNote', value)}
            onFocus={() => {
              // Keep bottom fields (esp. 계좌정보) visible above Android keyboard.
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
          />
          <TextField
            label="보험가입내역"
            multiline
            value={form.insuranceHistory}
            onChangeText={(value) => updateField('insuranceHistory', value)}
            onFocus={() => {
              // Keep bottom fields (esp. 계좌정보) visible above Android keyboard.
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
          />
          <TextField
            label="계좌정보"
            multiline
            value={form.accountNumber}
            onChangeText={(value) => updateField('accountNumber', value)}
            onFocus={() => {
              // Keep bottom fields (esp. 계좌정보) visible above Android keyboard.
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
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
            onPress={attemptCloseEdit}
            style={styles.grow}
          />
          <Button
            label={mode === 'create' ? '고객 등록' : '변경 저장'}
            variant="actionEmphasis"
            loading={saveMutation.isPending}
            disabled={mode === 'edit' ? !shouldEnableCustomerEditSave({ initialized, dirty, saving: saveMutation.isPending }) : saveMutation.isPending}
            onPress={submit}
            style={styles.grow}
          />
        </View>
      </SafeAreaView>

      <CustomerUnsavedChangesDialog
        open={discardOpen}
        busy={saveMutation.isPending}
        onCancel={() => setDiscardOpen(false)}
        onDiscard={discardDraftAndLeave}
        onSave={() => {
          setDiscardOpen(false);
          submit();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="md" style={{ alignSelf: "stretch" }}>
      <AppText variant="heading" numberOfLines={1}>
        {title}
      </AppText>
      <Stack gap="md">{children}</Stack>
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
        <AppText variant="body" color="textSecondary">고객 기념일·안내일을 등록합니다.</AppText>
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
        <AppText variant="body" color="textSecondary">
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
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.xl,
      gap: theme.spacing.md,
    },
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
    toggleRow: {
      minHeight: theme.controlSize.md,
      paddingVertical: theme.spacing.xs,
    },
  });
}
