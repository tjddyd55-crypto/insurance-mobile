import { AppText, Stack } from "../../../design-system";
import { CollapsibleDetailSection } from "../CollapsibleDetailSection";
import type { CustomerCustomFieldRecord } from "../customerCustomFieldsApi";

export function CustomerCustomFieldsDetailSection({
  items,
  loading,
  expanded,
  onExpandedChange,
}: {
  items: CustomerCustomFieldRecord[] | undefined;
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const rows = items ?? [];

  if (!loading && rows.length === 0) {
    return null;
  }

  return (
    <CollapsibleDetailSection
      title="추가 정보"
      testID="customer-detail-section-custom-fields"
      sectionId="customFields"
      expanded={expanded}
      onExpandedChange={onExpandedChange}
    >
      {loading ? (
        <AppText variant="body" color="textSecondary">추가 정보를 불러오는 중…</AppText>
      ) : (
        <Stack gap="md">
          {rows.map((item) => (
            <Stack key={item.id} gap="xs">
              <AppText variant="bodyStrong">{item.label}</AppText>
              <AppText variant="body" color="textSecondary">{item.value}</AppText>
            </Stack>
          ))}
        </Stack>
      )}
    </CollapsibleDetailSection>
  );
}
