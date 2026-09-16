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

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { CustomerDiscardChangesDialog } from './CustomerDiscardChangesDialog';
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
  useBottomSafeInset,
  type AppTheme,
} from '../../design-system';
import { AddressSearchField } from '../../components/AddressSearchField';
import { SavedAddressSearchField } from '../../components/SavedAddressSearchField';
import {
  EMPTY_CUSTOMER_FORM,
  customerBasicFormToPayload,
  customerFormToPayload,
  customerToForm,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormState,
} from './customerForm';
import {
  cloneCustomerFormState,
  createCustomerBasicFormSnapshot,
  createCustomerFormSnapshot,
  decideCloseEdit,
  isCustomerBasicFormDirty,
  isCustomerFormDirty,
  resolveCustomerEditHardwareBack,
  shouldEnableCustomerEditSave,
} from './customerFormDraft';
import { CUSTOMER_MOBILE_CARRIER_OPTIONS } from './customerCarrier';
import {
  CUSTOMER_INFLOW_SOURCE_OPTIONS,
  getInflowSourceDetailFieldMeta,
  requiresInflowSourceDetail,
} from './customerInflowSource';
import { CustomerAlertDatesEditor } from './CustomerAlertDatesEditor';
import { CollapsibleFormSection } from './CollapsibleFormSection';
import { DetailSubsectionLabel } from './CollapsibleDetailSection';
import { CustomerCarsEditor } from './CustomerCarsEditor';
import { CustomerFireInsuranceLocationsEditor } from './CustomerFireInsuranceLocationsEditor';
import { getCustomerAlertDatesValidationError } from './customerAlertDateFormUtils';
import {
  formatCustomerCreateChildSaveMessage,
  persistCustomerCreateChildCollections,
} from './customerCreateChildSave';
import { getCustomerCustomFieldsValidationError } from './customerCustomFieldFormUtils';
import { CustomerCustomFieldsEditor } from './CustomerCustomFieldsEditor';
import { createCustomer, getCustomer, updateCustomer } from './customersApi';
import { navigateToCustomerDetail } from './customerWorkspaceNavigation';
import {
  CUSTOMER_GENDER_FORM_OPTIONS,
  resolveSegmentSelectedVariant,
} from './customerFormChoices';
import {
  CUSTOMER_FORM_SECTION_TEST_IDS,
  CUSTOMER_FORM_SECTION_TITLES,
  type CustomerFormSectionId,
  resolveCustomerFormSectionOrder,
} from './customerFormSectionOrder';
import { customerQueryKeys } from './queryKeys';
import type { ListCustomersResult } from './types';

type CustomerFormScreenProps =
  | { mode: 'create'; customerId?: never }
  | { mode: 'edit-basic'; customerId: number };

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
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const kbHeightRef = useRef(0);
  const discardOpenRef = useRef(false);
  const initialCreateFocusDoneRef = useRef(false);
  const bottomInset = useBottomSafeInset();

  useEffect(() => {
    discardOpenRef.current = discardOpen;
  }, [discardOpen]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      kbHeightRef.current = event.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      kbHeightRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mode !== 'create' || initialCreateFocusDoneRef.current) return undefined;
      initialCreateFocusDoneRef.current = true;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return undefined;
    }, [mode]),
  );
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
    enabled: mode === 'edit-basic' && Boolean(token) && Number.isInteger(customerId) && customerId > 0,
  });

  useEffect(() => {
    if (mode !== 'edit-basic' || !customerQuery.data || initialized) return;
    const epoch = ++hydrateEpochRef.current;
    let cancelled = false;
    const customer = customerQuery.data;
    void (async () => {
      const next = customerToForm(customer);
      if (cancelled || epoch !== hydrateEpochRef.current) return;
      const hydrated: CustomerFormState = cloneCustomerFormState(next);
      originalFormRef.current = cloneCustomerFormState(hydrated);
      originalSnapshotRef.current = createCustomerBasicFormSnapshot(hydrated);
      setForm(cloneCustomerFormState(hydrated));
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerQuery.data, initialized, mode, token]);

  const dirty =
    initialized &&
    (mode === 'edit-basic'
      ? isCustomerBasicFormDirty(form, originalSnapshotRef.current)
      : isCustomerFormDirty(form, originalSnapshotRef.current));

  const formRef = useRef(form);
  formRef.current = form;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const draft = formRef.current;
      if (mode === 'create') {
        const payload = customerFormToPayload(draft, customerQuery.data);
        const saved = await createCustomer(token, payload);
        const childSave = await persistCustomerCreateChildCollections({
          token,
          customerId: saved.id,
          draft,
          queryClient,
        });
        return {
          saved,
          draft: cloneCustomerFormState(draft),
          mode,
          childSaveFailures: childSave.failures,
        };
      }
      const existing = customerQuery.data;
      if (!existing) {
        throw new Error('고객 정보를 불러오지 못했습니다.');
      }
      const payload = customerBasicFormToPayload(draft, existing);
      const saved = await updateCustomer(token, customerId, payload);
      return {
        saved,
        draft: cloneCustomerFormState(draft),
        mode,
        childSaveFailures: [],
      };
    },
    onSuccess: ({ saved, draft, mode: savedMode, childSaveFailures }) => {
      originalFormRef.current = cloneCustomerFormState(draft);
      originalSnapshotRef.current =
        savedMode === 'edit-basic'
          ? createCustomerBasicFormSnapshot(draft)
          : createCustomerFormSnapshot(draft);
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
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.detail(saved.id) });
      if (childSaveFailures.length > 0) {
        setValidationMessage(
          formatCustomerCreateChildSaveMessage({
            customerId: saved.id,
            failures: childSaveFailures,
          }),
        );
      } else {
        setValidationMessage(null);
      }
      router.replace({ pathname: '/customers/[customerId]', params: { customerId: String(saved.id) } });
    },
  });

  const leaveWithoutSave = useCallback(() => {
    if (mode === 'edit-basic' && customerId) {
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
        const action = resolveCustomerEditHardwareBack({
          keyboardVisible: kbHeightRef.current > 0,
          discardDialogOpen: discardOpenRef.current,
        });
        if (action === 'defer-to-dialog') {
          return false;
        }
        if (action === 'dismiss-keyboard') {
          Keyboard.dismiss();
          kbHeightRef.current = 0;
          return true;
        }
        attemptCloseEdit();
        return true;
      });
      return () => subscription.remove();
    }, [attemptCloseEdit]),
  );

  const updateField = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (validationMessage) {
      setValidationMessage(null);
    }
    if (errors[key]) {
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  };

  const submit = useCallback(() => {
    if (mode === 'edit-basic' && !initialized) return;
    if (saveMutation.isPending) return;
    if (mode === 'edit-basic' && !shouldEnableCustomerEditSave({ initialized, dirty, saving: false })) {
      return;
    }
    const nextErrors = validateCustomerForm(form, {
      mode: mode === 'edit-basic' ? 'edit' : mode,
      original: mode === 'edit-basic' ? originalFormRef.current ?? undefined : undefined,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setValidationMessage('입력 내용을 확인해 주세요.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const customFieldsErr =
      mode === 'create' ? getCustomerCustomFieldsValidationError(form.customFields) : null;
    if (customFieldsErr) {
      setValidationMessage(customFieldsErr);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const alertDatesErr =
      mode === 'create' ? getCustomerAlertDatesValidationError(form.specialDates) : null;
    if (alertDatesErr) {
      setValidationMessage(alertDatesErr);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setValidationMessage(null);
    saveMutation.mutate();
  }, [dirty, form, initialized, mode, saveMutation]);

  if (mode === 'edit-basic' && (customerQuery.isLoading || !initialized)) {
    return <LoadingState message="고객 정보를 불러오는 중…" />;
  }
  if (mode === 'edit-basic' && (customerQuery.isError || !customerQuery.data)) {
    return (
      <ErrorState
        title="고객 정보를 불러오지 못했습니다"
        message={customerQuery.error instanceof Error ? customerQuery.error.message : '고객을 찾을 수 없습니다.'}
        onRetry={() => void customerQuery.refetch()}
      />
    );
  }

  const sectionOrder = resolveCustomerFormSectionOrder(mode);

  const renderDriverChoice = () => (
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
  );

  const renderFormSection = (sectionId: CustomerFormSectionId) => {
    switch (sectionId) {
      case 'basic':
        return (
          <FormSection title={CUSTOMER_FORM_SECTION_TITLES.basic}>
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
            {renderDriverChoice()}
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
            <View testID="customer-form-basic-embedded-reference-fields">
              <DetailSubsectionLabel label="건강/보험 참고" />
              <TextField
                label="수술·치료 관련"
                multiline
                value={form.treatmentHistoryNote}
                onChangeText={(value) => updateField('treatmentHistoryNote', value)}
                onFocus={() => {
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
                  requestAnimationFrame(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
              <DetailSubsectionLabel label="보험 가입" />
              <TextField
                label="보험가입내역"
                multiline
                value={form.insuranceHistory}
                onChangeText={(value) => updateField('insuranceHistory', value)}
                onFocus={() => {
                  requestAnimationFrame(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
              <DetailSubsectionLabel label="계좌" />
              <TextField
                label="계좌정보"
                multiline
                value={form.accountNumber}
                onChangeText={(value) => updateField('accountNumber', value)}
                onFocus={() => {
                  requestAnimationFrame(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
            </View>
          </FormSection>
        );
      case 'vehicle':
        return (
          <CollapsibleFormSection
            title={CUSTOMER_FORM_SECTION_TITLES.vehicle}
            sectionId="car"
            testID={CUSTOMER_FORM_SECTION_TEST_IDS.vehicle}
          >
            <CustomerCarsEditor
              cars={form.cars}
              onChange={(cars) => updateField('cars', cars)}
              disabled={saveMutation.isPending}
            />
          </CollapsibleFormSection>
        );
      case 'business':
        return (
          <CollapsibleFormSection
            title={CUSTOMER_FORM_SECTION_TITLES.business}
            sectionId="business"
            testID={CUSTOMER_FORM_SECTION_TEST_IDS.business}
          >
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
            <SavedAddressSearchField
              savedAddress={form.businessInfo.businessAddress}
              onSavedAddressChange={(businessAddress) =>
                setForm((previous) => ({
                  ...previous,
                  businessInfo: { ...previous.businessInfo, businessAddress },
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
        );
      case 'fireInsurance':
        return (
          <CollapsibleFormSection
            title={CUSTOMER_FORM_SECTION_TITLES.fireInsurance}
            sectionId="fire"
            testID={CUSTOMER_FORM_SECTION_TEST_IDS.fireInsurance}
          >
            <CustomerFireInsuranceLocationsEditor
              items={form.fireInsuranceLocations}
              onChange={(fireInsuranceLocations) =>
                updateField('fireInsuranceLocations', fireInsuranceLocations)
              }
              disabled={saveMutation.isPending}
            />
          </CollapsibleFormSection>
        );
      case 'alertDates':
        return (
          <FormSection
            title={CUSTOMER_FORM_SECTION_TITLES.alertDates}
            testID={CUSTOMER_FORM_SECTION_TEST_IDS.alertDates}
          >
            <CustomerAlertDatesEditor
              items={form.specialDates}
              onChange={(specialDates) => updateField('specialDates', specialDates)}
              disabled={saveMutation.isPending}
            />
          </FormSection>
        );
      case 'customFields':
        return (
          <FormSection
            title={CUSTOMER_FORM_SECTION_TITLES.customFields}
            testID={CUSTOMER_FORM_SECTION_TEST_IDS.customFields}
          >
            <CustomerCustomFieldsEditor
              items={form.customFields}
              onChange={(customFields) => updateField('customFields', customFields)}
              disabled={saveMutation.isPending}
            />
          </FormSection>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <AppHeader
        title={mode === 'create' ? '고객 등록' : '기본 정보 수정'}
        showMenu={false}
        showBack
        onBackPress={attemptCloseEdit}
      />
      <View style={[styles.body, { paddingBottom: bottomInset }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: theme.spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {sectionOrder.map((sectionId) => (
          <View key={sectionId}>{renderFormSection(sectionId)}</View>
        ))}

        {validationMessage ? (
          <AppText color="danger" accessibilityRole="alert">
            {validationMessage}
          </AppText>
        ) : null}
        {saveMutation.isError ? (
          <AppText color="danger" accessibilityRole="alert">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : '고객 정보를 저장하지 못했습니다.'}
          </AppText>
        ) : null}

        <View style={styles.footer}>
          <Button
            label="취소"
            variant="secondary"
            disabled={saveMutation.isPending}
            onPress={attemptCloseEdit}
            style={styles.grow}
          />
          <Button
            label={
              saveMutation.isPending
                ? '저장 중...'
                : mode === 'create'
                  ? '고객 등록'
                  : '저장'
            }
            variant="actionEmphasis"
            loading={saveMutation.isPending}
            disabled={
              mode === 'edit-basic'
                ? !shouldEnableCustomerEditSave({
                    initialized,
                    dirty,
                    saving: saveMutation.isPending,
                  })
                : saveMutation.isPending
            }
            onPress={submit}
            style={styles.grow}
          />
        </View>
      </ScrollView>
      </View>

      <CustomerDiscardChangesDialog
        open={discardOpen}
        onContinueEditing={() => setDiscardOpen(false)}
        onDiscard={discardDraftAndLeave}
      />
    </KeyboardAvoidingView>
  );
}

function FormSection({
  title,
  children,
  testID,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <Stack gap="md" style={{ alignSelf: "stretch" }} testID={testID}>
      <AppText variant="heading" numberOfLines={1}>
        {title}
      </AppText>
      <Stack gap="md">{children}</Stack>
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
    body: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.xl,
      gap: theme.spacing.md,
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    grow: { flex: 1 },
    toggleRow: {
      minHeight: theme.controlSize.md,
      paddingVertical: theme.spacing.xs,
    },
  });
}
