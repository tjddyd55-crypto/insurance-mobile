import type { CustomerRelationGroup } from "./customerRelationGroupsApi";
import type { CustomerRelationRow } from "./customerRelationsApi";

/** FAMILY 그룹만 가족 section 대상으로 분리 */
export function selectFamilyGroups(
  groups: CustomerRelationGroup[],
): CustomerRelationGroup[] {
  return groups.filter((group) => {
    const type = String(group.groupType ?? "FAMILY").toUpperCase();
    return type === "FAMILY" || type === "";
  });
}

/**
 * 개별 관계 isolation:
 * 가족 멤버 ID 집합에 없는 관계자만 "관계자 전용"으로 본다.
 * (Web은 중복 허용이므로 표시 자체는 막지 않고, 검증용 헬퍼로 분리한다.)
 */
export function listIndividualRelationsExclusiveOfFamily(
  relations: CustomerRelationRow[],
  familyGroups: CustomerRelationGroup[],
): CustomerRelationRow[] {
  const familyIds = new Set<number>();
  for (const group of familyGroups) {
    for (const member of group.members) familyIds.add(member.customerId);
  }
  return relations.filter((row) => !familyIds.has(row.relatedCustomerId));
}

/** 가족 그룹 멤버십이 고객마다 동일하게 보이는지 (동일 member id set) */
export function familyMemberIdsEqual(
  left: CustomerRelationGroup | null | undefined,
  right: CustomerRelationGroup | null | undefined,
): boolean {
  const a = new Set((left?.members ?? []).map((m) => m.customerId));
  const b = new Set((right?.members ?? []).map((m) => m.customerId));
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}
