import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DateField } from "../../components/DateField";
import { AppText, Button, Stack, TextField, useAppTheme, type AppTheme } from "../../design-system";
import {
  DEFAULT_ALERT_DATE_PURPOSE,
  formatCustomerAlertDateLabel,
} from "./customerAlertDateDisplay";
import {
  getCustomerAlertDatesValidationError,
  isCustomerAlertDateEmpty,
} from "./customerAlertDateFormUtils";
import { formatCustomerDetailDate } from "./customerDetailPresentation";
import { CustomerSectionEditModal } from "./detail-sections/CustomerSectionEditModal";
import { SectionAddAction } from "./detail-sections/CustomerSectionActions";
import type { CustomerSpecialDateFormItem } from "./customerSpecialDatesApi";

export function createEmptyAlertDateFormItem(): CustomerSpecialDateFormItem {
  return {
    purposeType: DEFAULT_ALERT_DATE_PURPOSE,
    title: "",
    dateValue: "",
    memo: "",
  };
}

type EditMode = { kind: "add"; index: number } | { kind: "edit"; index: number };

export function CustomerAlertDatesEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: CustomerSpecialDateFormItem[];
  onChange: (next: CustomerSpecialDateFormItem[]) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [draft, setDraft] = useState<CustomerSpecialDateFormItem>(createEmptyAlertDateFormItem());
  const [error, setError] = useState("");

  const visibleItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isCustomerAlertDateEmpty(item));

  const openAdd = () => {
    const nextIndex = items.length;
    onChange([...items, createEmptyAlertDateFormItem()]);
    setDraft(createEmptyAlertDateFormItem());
    setError("");
    setEditMode({ kind: "add", index: nextIndex });
  };

  const openEdit = (index: number) => {
    setDraft(items[index] ?? createEmptyAlertDateFormItem());
    setError("");
    setEditMode({ kind: "edit", index });
  };

  const closeEditor = () => {
    if (editMode?.kind === "add") {
      const next = items.filter((_, itemIndex) => itemIndex !== editMode.index);
      onChange(next);
    }
    setEditMode(null);
    setError("");
  };

  const saveEditor = () => {
    if (!editMode) return;
    const validationError = getCustomerAlertDatesValidationError([draft]);
    if (validationError) {
      setError(validationError);
      return;
    }
    const next = [...items];
    next[editMode.index] = {
      ...draft,
      title: draft.title.trim(),
      dateValue: draft.dateValue.trim(),
      memo: draft.memo.trim(),
    };
    onChange(next);
    setEditMode(null);
    setError("");
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setEditMode(null);
    setError("");
  };

  return (
    <Stack gap="md">
      {visibleItems.length ? (
        <Stack gap="xs">
          {visibleItems.map(({ item, index }) => (
            <View key={item.id ?? `alert-${index}`} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => openEdit(index)}
                style={({ pressed }) => [
                  styles.rowMain,
                  pressed && !disabled ? styles.rowPressed : null,
                ]}
              >
                <AppText variant="bodyStrong">{formatCustomerAlertDateLabel(item)}</AppText>
                <AppText variant="body" color="textSecondary">
                  {formatCustomerDetailDate(item.dateValue)}
                </AppText>
              </Pressable>
              <Button
                label="×"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onPress={() => removeAt(index)}
                accessibilityLabel="알림일 삭제"
              />
            </View>
          ))}
        </Stack>
      ) : (
        <AppText variant="body" color="textSecondary">등록된 알림일이 없습니다.</AppText>
      )}

      <SectionAddAction
        label="+ 알림일 추가"
        disabled={disabled}
        onPress={openAdd}
      />

      <CustomerSectionEditModal
        open={editMode != null}
        title={editMode?.kind === "edit" ? "알림일 수정" : "알림일 추가"}
        saveLabel={editMode?.kind === "edit" ? "저장" : "추가"}
        onCancel={closeEditor}
        onSave={saveEditor}
      >
        <TextField
          label="알림명"
          value={draft.title}
          onChangeText={(value) => setDraft((previous) => ({ ...previous, title: value }))}
          placeholder="예: 자동차보험 만기"
        />
        <DateField
          label="날짜"
          value={draft.dateValue}
          onChange={(value) => setDraft((previous) => ({ ...previous, dateValue: value }))}
        />
        {editMode?.kind === "edit" ? (
          <AppText
            variant="body"
            color="danger"
            onPress={() => editMode && removeAt(editMode.index)}
          >
            알림일 삭제
          </AppText>
        ) : null}
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowPressed: {
      opacity: 0.75,
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs,
    },
  });
}
