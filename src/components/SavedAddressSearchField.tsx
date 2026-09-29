import { useEffect, useRef, useState } from "react";

import { AddressSearchField } from "./AddressSearchField";
import {
  formatAddressForSave,
  parseAddressFromSave,
  type AddressSearchValue,
} from "../features/customers/customerAddressSearch";

type SavedAddressSearchFieldProps = {
  savedAddress: string;
  onSavedAddressChange: (address: string) => void;
  disabled?: boolean;
};

/**
 * Parent가 단일 address 문자열을 보관할 때 상세주소 입력이 기본주소로 합쳐지지 않도록
 * AddressSearchValue를 로컬 state로 유지한다.
 */
export function SavedAddressSearchField({
  savedAddress,
  onSavedAddressChange,
  disabled = false,
}: SavedAddressSearchFieldProps) {
  const [value, setValue] = useState<AddressSearchValue>(() =>
    parseAddressFromSave(savedAddress),
  );
  const lastEmittedRef = useRef(savedAddress);

  useEffect(() => {
    if (savedAddress === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = savedAddress;
    setValue(parseAddressFromSave(savedAddress));
  }, [savedAddress]);

  const handleChange = (next: AddressSearchValue) => {
    setValue(next);
    const formatted = formatAddressForSave(next);
    lastEmittedRef.current = formatted;
    onSavedAddressChange(formatted);
  };

  return (
    <AddressSearchField value={value} onChange={handleChange} disabled={disabled} />
  );
}
