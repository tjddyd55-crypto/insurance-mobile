import { AddressSearchField } from "../../components/AddressSearchField";
import { AppText, Button, Inline, Stack, TextField } from "../../design-system";
import {
  formatAddressForSave,
  parseAddressFromSave,
} from "./customerAddressSearch";
import {
  createEmptyFireInsuranceLocation,
  type CustomerFireInsuranceLocationFormItem,
} from "./customerFireInsuranceLocationsApi";

type Props = {
  items: CustomerFireInsuranceLocationFormItem[];
  onChange: (next: CustomerFireInsuranceLocationFormItem[]) => void;
  disabled?: boolean;
};

export function CustomerFireInsuranceLocationsEditor({
  items,
  onChange,
  disabled = false,
}: Props) {
  const updateAt = (index: number, next: CustomerFireInsuranceLocationFormItem) => {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  };

  const removeAt = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [createEmptyFireInsuranceLocation()]);
  };

  const addItem = () => {
    onChange([...items, createEmptyFireInsuranceLocation()]);
  };

  return (
    <Stack gap="md">
      {items.map((item, index) => (
        <Stack
          key={item.id != null ? `id-${item.id}` : `idx-${index}`}
          gap="sm"
          style={{ alignSelf: "stretch" }}
        >
          <Inline justify="space-between" align="center">
            <AppText variant="bodyStrong">소재지 {index + 1}</AppText>
            <Button
              label="삭제"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onPress={() => removeAt(index)}
            />
          </Inline>
          <AddressSearchField
            value={parseAddressFromSave(item.address)}
            onChange={(address) =>
              updateAt(index, { ...item, address: formatAddressForSave(address) })
            }
            disabled={disabled}
          />
          <TextField
            label="메모"
            multiline
            value={item.memo}
            editable={!disabled}
            onChangeText={(value) => updateAt(index, { ...item, memo: value })}
          />
        </Stack>
      ))}
      <Button
        label="+ 소재지 추가"
        variant="secondary"
        disabled={disabled}
        onPress={addItem}
      />
    </Stack>
  );
}
