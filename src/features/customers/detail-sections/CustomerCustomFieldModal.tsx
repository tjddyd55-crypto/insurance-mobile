import { useEffect, useState } from "react";

import { AppText, TextField } from "../../../design-system";
import { getCustomerCustomFieldsValidationError } from "../customerCustomFieldFormUtils";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";

export type CustomerCustomFieldModalMode = "create" | "edit";

export function resolveCustomerCustomFieldModalTitle(
  mode: CustomerCustomFieldModalMode,
): string {
  return mode === "edit" ? "추가 정보 수정" : "추가 정보 등록";
}

type CustomerCustomFieldModalProps = {
  open: boolean;
  mode: CustomerCustomFieldModalMode;
  initialLabel?: string;
  initialValue?: string;
  saving?: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSave: (payload: { label: string; value: string }) => void;
};

export function CustomerCustomFieldModal({
  open,
  mode,
  initialLabel = "",
  initialValue = "",
  saving = false,
  serverError = null,
  onClose,
  onSave,
}: CustomerCustomFieldModalProps) {
  const [label, setLabel] = useState(initialLabel);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(initialLabel);
    setValue(initialValue);
    setError(null);
  }, [open, initialLabel, initialValue]);

  const handleSave = () => {
    const payload = { label: label.trim(), value: value.trim() };
    const validationError = getCustomerCustomFieldsValidationError([payload]);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSave(payload);
  };

  return (
    <CustomerSectionEditModal
      open={open}
      title={resolveCustomerCustomFieldModalTitle(mode)}
      saving={saving}
      onCancel={onClose}
      onSave={handleSave}
    >
      <TextField label="라벨" value={label} onChangeText={setLabel} />
      <TextField label="내용" multiline value={value} onChangeText={setValue} />
      {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      {!error && serverError ? (
        <AppText variant="caption" color="danger">{serverError}</AppText>
      ) : null}
    </CustomerSectionEditModal>
  );
}
