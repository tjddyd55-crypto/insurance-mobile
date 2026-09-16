import { AppText, Button, Stack, TextField } from "../../design-system";
import {
  CUSTOMER_CUSTOM_FIELD_LABEL_MAX,
  CUSTOMER_CUSTOM_FIELD_VALUE_MAX,
  type CustomerCustomFieldFormItem,
} from "./customerCustomFieldsApi";
import { createEmptyCustomerCustomField } from "./customerCustomFieldFormUtils";

export function CustomerCustomFieldsEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: CustomerCustomFieldFormItem[];
  onChange: (next: CustomerCustomFieldFormItem[]) => void;
  disabled?: boolean;
}) {
  const updateAt = (index: number, next: CustomerCustomFieldFormItem) => {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  };

  return (
    <Stack gap="md">
      <Button
        label="+ 항목 추가"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onPress={() => onChange([...items, createEmptyCustomerCustomField()])}
      />
      {!items.length ? (
        <AppText variant="body" color="textSecondary">
          등록된 추가 정보가 없습니다.
        </AppText>
      ) : null}
      {items.map((item, index) => (
        <Stack key={item.id ?? `custom-field-${index}`} gap="sm">
          <TextField
            label="라벨"
            value={item.label}
            maxLength={CUSTOMER_CUSTOM_FIELD_LABEL_MAX}
            editable={!disabled}
            onChangeText={(value) => updateAt(index, { ...item, label: value })}
          />
          <TextField
            label="입력값"
            value={item.value}
            maxLength={CUSTOMER_CUSTOM_FIELD_VALUE_MAX}
            editable={!disabled}
            multiline
            onChangeText={(value) => updateAt(index, { ...item, value: value })}
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
