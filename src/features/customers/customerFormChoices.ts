import type { ButtonVariant } from '../../design-system';

export const CUSTOMER_GENDER_FORM_OPTIONS = [
  { value: 'male' as const, label: '남' },
  { value: 'female' as const, label: '여' },
];

export function resolveChoiceButtonVariant(
  optionValue: string,
  currentValue: string,
): ButtonVariant {
  if (!optionValue.trim()) {
    return 'secondary';
  }
  return currentValue === optionValue ? 'selected' : 'secondary';
}

export function resolveSegmentSelectedVariant(
  optionValue: string,
  currentValue: string,
): ButtonVariant {
  return currentValue === optionValue ? 'selected' : 'secondary';
}

export const CUSTOMER_WORKSPACE_NAVIGATION_VARIANT: ButtonVariant = 'secondary';
