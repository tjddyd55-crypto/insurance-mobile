import { useState } from "react";

import { Button, Stack, TextField } from "../design-system";
import type { AddressSearchValue } from "../features/customers/customerAddressSearch";
import { AddressSearchModal } from "./address-search";

type AddressSearchFieldProps = {
  value: AddressSearchValue;
  onChange: (next: AddressSearchValue) => void;
  disabled?: boolean;
  searchButtonLabel?: string;
  zonecodePlaceholder?: string;
  addressPlaceholder?: string;
  detailPlaceholder?: string;
};

/**
 * 주소 입력 필드. 검색 dialog UI 는 `AddressSearchModal`(Platform public registration parity) 공통 사용.
 */
export function AddressSearchField({
  value,
  onChange,
  disabled = false,
  searchButtonLabel = "주소 검색",
  zonecodePlaceholder = "우편번호",
  addressPlaceholder = "주소 검색 버튼을 눌러 주세요",
  detailPlaceholder = "상세주소 (동/호수 등)",
}: AddressSearchFieldProps) {
  const [open, setOpen] = useState(false);

  const openDialog = () => {
    if (disabled) return;
    setOpen(true);
  };

  return (
    <Stack gap="sm">
      <Button
        label={searchButtonLabel}
        size="sm"
        variant="secondary"
        fullWidth
        disabled={disabled}
        testID="address-search-open"
        onPress={openDialog}
      />
      <TextField
        label="우편번호"
        value={value.zonecode}
        editable={false}
        placeholder={zonecodePlaceholder}
        onPressIn={disabled ? undefined : openDialog}
      />
      <TextField
        label="기본주소"
        value={value.baseAddress}
        editable={false}
        placeholder={addressPlaceholder}
        onPressIn={disabled ? undefined : openDialog}
      />
      <TextField
        label="상세주소"
        value={value.detailAddress}
        editable={!disabled}
        placeholder={detailPlaceholder}
        onChangeText={(detailAddress) => onChange({ ...value, detailAddress })}
      />
      <AddressSearchModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(selected) =>
          onChange({
            ...value,
            zonecode: selected.zonecode,
            baseAddress: selected.baseAddress,
          })
        }
      />
    </Stack>
  );
}
