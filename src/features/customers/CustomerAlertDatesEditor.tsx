import { AppText, Button, Inline, Stack, TextField } from "../../design-system";
import { DEFAULT_ALERT_DATE_PURPOSE } from "./customerAlertDateDisplay";
import type { CustomerSpecialDateFormItem } from "./customerSpecialDatesApi";

export function createEmptyAlertDateFormItem(): CustomerSpecialDateFormItem {
  return {
    purposeType: DEFAULT_ALERT_DATE_PURPOSE,
    title: "",
    dateValue: "",
    memo: "",
  };
}

export function CustomerAlertDatesEditor({
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
        <AppText variant="body" color="textSecondary">고객 알림일을 등록합니다.</AppText>
        <Button
          label="알림일 추가"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onPress={() => onChange([...items, createEmptyAlertDateFormItem()])}
        />
      </Inline>
      {!items.length ? (
        <AppText variant="body" color="textSecondary">등록된 알림일이 없습니다.</AppText>
      ) : null}
      {items.map((item, index) => (
        <Stack key={item.id ?? `alert-${index}`} gap="sm">
          <TextField
            label="라벨"
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
          <Button
            label="삭제"
            size="sm"
            variant="danger"
            disabled={disabled}
            onPress={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          />
        </Stack>
      ))}
    </Stack>
  );
}
