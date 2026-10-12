import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";

import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  AppText,
  Button,
  Inline,
  ModalShell,
  SelectField,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { searchCustomers } from "./customerSearchApi";
import { matchesCustomerPickerQuery } from "./customerPickerSearch";
import { formatCustomerPhone } from "./customerModel";
import { getCustomerGenderPresentationTone } from "./customerDetailPresentation";
import {
  createCustomerRelation,
  deleteCustomerRelation,
  listCustomerRelations,
} from "./customerRelationsApi";
import {
  addCustomerRelationGroupMember,
  createCustomerRelationGroup,
  deleteCustomerRelationGroup,
  listCustomerRelationGroups,
  removeCustomerRelationGroupMember,
  updateCustomerRelationGroupMemberLabel,
  updateCustomerRelationGroupName,
  type CustomerRelationGroup,
  type RelationGroupMember,
} from "./customerRelationGroupsApi";
import {
  listIndividualRelationsExclusiveOfFamily,
  selectFamilyGroups,
} from "./customerRelationPresentation";
import {
  RELATIONSHIP_LABEL_SELECT_OPTIONS,
  resolveRelationshipLabel,
} from "./relationshipLabel";
import { customerDetailPath } from "./customerWorkspaceNavigation";
import {
  CollapsibleDetailSection,
  DetailSubsectionLabel,
} from "./CollapsibleDetailSection";

type PickerMode =
  | { kind: "legacy-add" }
  | { kind: "family-create" }
  | { kind: "family-add-member"; groupId: number }
  | null;

/** PC CustomerRelationGroupsSection: 입력 후 250ms debounce 로 /api/customers/search 호출. */
export const RELATION_PICKER_SEARCH_DEBOUNCE_MS = 250;
/** PC 구성원 추가 모달과 같이 외곽 높이 고정 — 결과 수와 무관. */
export const RELATION_PICKER_BODY_HEIGHT = 440;

function formatBirthDot(value: string | null | undefined): string {
  const raw = String(value ?? "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : "";
}

export function CustomerRelationsPanel({ customerId }: { customerId: number }) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState<PickerMode>(null);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [labelOption, setLabelOption] = useState("배우자");
  const [labelCustom, setLabelCustom] = useState("");
  const [pendingRemove, setPendingRemove] = useState<
    | { kind: "legacy"; relatedCustomerId: number; name: string }
    | { kind: "member"; groupId: number; customerId: number; name: string }
    | { kind: "group"; groupId: number; name: string }
    | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<{ groupId: number; name: string } | null>(null);
  const [labelTarget, setLabelTarget] = useState<{
    groupId: number;
    customerId: number;
    name: string;
  } | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { height: windowHeight } = useWindowDimensions();
  const pickerBodyHeight = Math.min(RELATION_PICKER_BODY_HEIGHT, Math.round(windowHeight * 0.55));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["customer-relation-groups", customerId],
    queryFn: () => listCustomerRelationGroups(token, customerId),
    enabled: Boolean(token),
  });
  const relationsQuery = useQuery({
    queryKey: ["customer-relations", customerId],
    queryFn: () => listCustomerRelations(token, customerId),
    enabled: Boolean(token),
  });
  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(search.trim()),
      RELATION_PICKER_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [search]);
  // PC parity: 서버 검색 SSOT (GET /api/customers/search?q=&limit=50). 빈 검색어는 호출하지 않음.
  const customersQuery = useQuery({
    queryKey: ["customer-relation-picker-search", debouncedSearch],
    queryFn: () => searchCustomers(token, debouncedSearch, { limit: 50 }),
    enabled: Boolean(token) && picker != null && debouncedSearch.length > 0,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-relation-groups", customerId] }),
      queryClient.invalidateQueries({ queryKey: ["customer-relations", customerId] }),
    ]);
  };

  const createGroup = useMutation({
    mutationFn: async (member: { customerId: number; relationshipLabel: string }) => {
      const name = groupName.trim();
      if (!name) {
        throw new Error("그룹 이름을 입력해 주세요.");
      }
      return createCustomerRelationGroup(token, customerId, {
        name,
        groupType: "FAMILY",
        members: [member],
      });
    },
    onSuccess: async () => {
      setPicker(null);
      setGroupName("");
      setNotice("그룹을 만들었습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "그룹 생성 실패"),
  });

  const addMember = useMutation({
    mutationFn: (input: {
      groupId: number;
      customerId: number;
      relationshipLabel: string;
    }) =>
      addCustomerRelationGroupMember(token, input.groupId, {
        customerId: input.customerId,
        relationshipLabel: input.relationshipLabel,
      }),
    onSuccess: async () => {
      setPicker(null);
      setNotice("그룹 구성원을 추가했습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "그룹 구성원 추가 실패"),
  });

  const addLegacy = useMutation({
    mutationFn: (relatedCustomerId: number) =>
      createCustomerRelation(token, customerId, relatedCustomerId),
    onSuccess: async () => {
      setPicker(null);
      setNotice("고객을 연결했습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "고객 연결 실패"),
  });

  const groups = selectFamilyGroups(groupsQuery.data ?? []);
  const individualRelations = listIndividualRelationsExclusiveOfFamily(
    relationsQuery.data ?? [],
    groups,
  );

  const excludedIds = useMemo(() => {
    const ids = new Set<number>([customerId]);
    if (picker?.kind === "legacy-add") {
      for (const relation of relationsQuery.data ?? []) {
        ids.add(relation.relatedCustomerId);
      }
      return ids;
    }
    for (const group of groupsQuery.data ?? []) {
      for (const member of group.members) ids.add(member.customerId);
    }
    return ids;
  }, [customerId, groupsQuery.data, picker?.kind, relationsQuery.data]);

  const pickerRows = useMemo(() => {
    if (!search.trim() || !debouncedSearch) return [];
    // 서버 결과 중 이름/전화번호 매칭만 노출 (고객코드·id 매칭 등 제외).
    return (customersQuery.data ?? [])
      .filter((row) => !excludedIds.has(row.id))
      .filter((row) => matchesCustomerPickerQuery(row, debouncedSearch));
  }, [customersQuery.data, debouncedSearch, excludedIds, search]);
  const pickerSearching =
    Boolean(search.trim()) && (search.trim() !== debouncedSearch || customersQuery.isFetching);

  const openPicker = (mode: NonNullable<PickerMode>) => {
    setSearch("");
    setDebouncedSearch("");
    setError("");
    setPicker(mode);
  };

  const openRelated = (relatedId: number) => {
    if (relatedId === customerId) return;
    router.push(customerDetailPath(relatedId) as Href);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    try {
      if (pendingRemove.kind === "legacy") {
        await deleteCustomerRelation(token, customerId, pendingRemove.relatedCustomerId);
        setNotice("연결을 해제했습니다.");
      } else if (pendingRemove.kind === "member") {
        await removeCustomerRelationGroupMember(
          token,
          pendingRemove.groupId,
          pendingRemove.customerId,
        );
        setNotice("그룹 구성원을 제외했습니다.");
      } else {
        await deleteCustomerRelationGroup(token, pendingRemove.groupId);
        setNotice("그룹을 해제했습니다.");
      }
      setPendingRemove(null);
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  const handlePickCustomer = (relatedId: number) => {
    setError("");
    if (picker?.kind === "legacy-add") {
      addLegacy.mutate(relatedId);
      return;
    }
    const label = resolveRelationshipLabel(labelOption, labelCustom);
    if (!label) {
      setError("관계 종류를 선택해 주세요.");
      return;
    }
    if (picker?.kind === "family-create") {
      createGroup.mutate({ customerId: relatedId, relationshipLabel: label });
      return;
    }
    if (picker?.kind === "family-add-member") {
      addMember.mutate({
        groupId: picker.groupId,
        customerId: relatedId,
        relationshipLabel: label,
      });
    }
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const name = renameTarget.name.trim();
    if (!name) {
      setError("그룹 이름을 입력해 주세요.");
      return;
    }
    try {
      await updateCustomerRelationGroupName(token, renameTarget.groupId, name);
      setRenameTarget(null);
      setNotice("그룹 이름을 수정했습니다.");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 이름 수정 실패");
    }
  };

  const saveLabel = async () => {
    if (!labelTarget) return;
    const label = resolveRelationshipLabel(labelOption, labelCustom);
    if (!label) {
      setError("관계 종류를 선택해 주세요.");
      return;
    }
    try {
      await updateCustomerRelationGroupMemberLabel(
        token,
        labelTarget.groupId,
        labelTarget.customerId,
        label,
      );
      setLabelTarget(null);
      setNotice("관계를 수정했습니다.");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "관계 수정 실패");
    }
  };

  const renderMemberMeta = (member: RelationGroupMember) => {
    const tone = getCustomerGenderPresentationTone(member.gender ?? null);
    const birth = formatBirthDot(member.birthDate);
    return (
      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
        {member.relationshipLabel || "관계 미지정"}
        {tone ? " · " : ""}
        {tone ? (
          <AppText
            variant="caption"
            style={{ color: tone === "male" ? theme.colors.info : theme.colors.danger }}
          >
            {tone === "male" ? "남" : "여"}
          </AppText>
        ) : null}
        {birth ? ` · ${birth}` : ""}
      </AppText>
    );
  };

  const renderGroup = (group: CustomerRelationGroup) => (
    <Stack key={group.id} gap="xs" style={styles.groupBlock} testID="customer-relation-family-group">
      <Inline justify="space-between" align="center" wrap gap="xs">
        <AppText variant="bodyStrong">{group.name}</AppText>
        <Inline gap="xs">
          <Button
            label="구성원 추가"
            size="sm"
            variant="secondary"
            onPress={() => {
              setLabelOption("배우자");
              setLabelCustom("");
              openPicker({ kind: "family-add-member", groupId: group.id });
            }}
          />
          <Button
            label="이름 수정"
            size="sm"
            variant="secondary"
            onPress={() => {
              setError("");
              setRenameTarget({ groupId: group.id, name: group.name });
            }}
          />
          <Button
            label="그룹 삭제"
            size="sm"
            variant="secondary"
            onPress={() =>
              setPendingRemove({
                kind: "group",
                groupId: group.id,
                name: group.name,
              })
            }
          />
        </Inline>
      </Inline>
      {group.members.map((member) => (
        <Pressable
          key={`${group.id}-${member.customerId}`}
          accessibilityRole="button"
          testID={member.isCurrentCustomer ? "customer-relation-member-current" : "customer-relation-member"}
          onPress={() => openRelated(member.customerId)}
          style={[styles.memberCard, member.isCurrentCustomer && styles.memberCardCurrent]}
        >
          <View style={styles.rowText}>
            <Inline gap="xs" align="center">
              <AppText variant="bodyStrong" numberOfLines={1}>
                {member.name}
              </AppText>
              {member.isCurrentCustomer ? (
                <View style={styles.currentBadge}>
                  <AppText variant="caption" color="success">
                    현재
                  </AppText>
                </View>
              ) : null}
            </Inline>
            {renderMemberMeta(member)}
          </View>
          {!member.isCurrentCustomer ? (
            <Inline gap="xs">
              <Button
                label="관계"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setError("");
                  const current = member.relationshipLabel || "배우자";
                  const preset = RELATIONSHIP_LABEL_SELECT_OPTIONS.some((o) => o.value === current);
                  setLabelOption(preset ? current : "기타");
                  setLabelCustom(preset ? "" : current);
                  setLabelTarget({
                    groupId: group.id,
                    customerId: member.customerId,
                    name: member.name,
                  });
                }}
              />
              <Button
                label="제거"
                size="sm"
                variant="danger"
                onPress={() =>
                  setPendingRemove({
                    kind: "member",
                    groupId: group.id,
                    customerId: member.customerId,
                    name: member.name,
                  })
                }
              />
            </Inline>
          ) : null}
        </Pressable>
      ))}
    </Stack>
  );

  return (
    <>
      <CollapsibleDetailSection
        title="연계 고객"
        testID="customer-detail-section-linked-customers"
        sectionId="linked"
        defaultExpanded={false}
      >
        {groupsQuery.isLoading ? (
          <AppText variant="caption">그룹을 불러오는 중…</AppText>
        ) : groups.length ? (
          groups.map(renderGroup)
        ) : (
          <>
            <DetailSubsectionLabel label="그룹" />
            <Inline justify="space-between" align="center">
              <AppText variant="caption" color="textSecondary">
                등록된 그룹이 없습니다.
              </AppText>
              <Button
                label="그룹 만들기"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setGroupName("");
                  setLabelOption("배우자");
                  setLabelCustom("");
                  openPicker({ kind: "family-create" });
                }}
              />
            </Inline>
          </>
        )}

        <View style={styles.divider} />
        <Inline justify="space-between" align="center">
          <DetailSubsectionLabel label="개별 연결" />
          <Button
            label="개별 연결"
            size="sm"
            variant="secondary"
            onPress={() => openPicker({ kind: "legacy-add" })}
          />
        </Inline>
        {relationsQuery.isLoading ? (
          <AppText variant="caption">연결 고객을 불러오는 중…</AppText>
        ) : individualRelations.length ? (
          <Inline wrap gap="xs" testID="customer-relation-individual-chips">
            {individualRelations.map((relation) => (
              <View
                key={`relation:${relation.relatedCustomerId}:${relation.createdAt}`}
                style={styles.chip}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openRelated(relation.relatedCustomerId)}
                  style={styles.chipName}
                >
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {relation.relatedName}
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${relation.relatedName} 연결 해제`}
                  hitSlop={8}
                  onPress={() =>
                    setPendingRemove({
                      kind: "legacy",
                      relatedCustomerId: relation.relatedCustomerId,
                      name: relation.relatedName,
                    })
                  }
                  style={styles.chipRemove}
                >
                  <AppText variant="body" color="textSecondary">
                    ✕
                  </AppText>
                </Pressable>
              </View>
            ))}
          </Inline>
        ) : (
          <AppText variant="caption" color="textSecondary">
            연결된 고객이 없습니다.
          </AppText>
        )}

        {notice ? (
          <AppText variant="caption" color="success">
            {notice}
          </AppText>
        ) : null}
        {error ? (
          <AppText variant="caption" color="danger">
            {error}
          </AppText>
        ) : null}
      </CollapsibleDetailSection>

      <ModalShell
        open={picker != null}
        presentation="dialog"
        scroll={false}
        dialogHeaderCompact
        title={
          picker?.kind === "legacy-add"
            ? "개별 연결"
            : picker?.kind === "family-create"
              ? "그룹 만들기"
              : "구성원 추가"
        }
        onRequestClose={() => setPicker(null)}
        footer={
          <Inline justify="flex-end">
            <Button label="닫기" size="sm" variant="secondary" onPress={() => setPicker(null)} />
          </Inline>
        }
      >
        {/* 외곽 크기 고정: 입력부는 고정, 결과 목록만 내부 스크롤 (0/1/5/20명에도 모달이 움직이지 않음). */}
        <View style={[styles.pickerBody, { height: pickerBodyHeight }]} testID="customer-relation-picker-body">
          <Stack gap="sm" style={styles.pickerFixed}>
            {picker?.kind === "family-create" ? (
              <TextField
                label="그룹 이름"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="예: 가족, 직장, 지인"
              />
            ) : null}
            {picker?.kind !== "legacy-add" ? (
              <>
                <SelectField
                  label="관계"
                  value={labelOption}
                  options={RELATIONSHIP_LABEL_SELECT_OPTIONS}
                  onChange={setLabelOption}
                />
                {labelOption === "기타" ? (
                  <TextField
                    label="관계 직접 입력"
                    value={labelCustom}
                    onChangeText={setLabelCustom}
                    placeholder="관계를 입력해 주세요"
                  />
                ) : null}
              </>
            ) : null}
            <TextField
              label="고객 검색"
              value={search}
              onChangeText={setSearch}
              placeholder="고객명 또는 휴대폰번호"
              autoCorrect={false}
              autoFocus
            />
          </Stack>
          <FlatList
            data={pickerRows}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.pickerList}
            testID="customer-relation-picker-results"
            ListEmptyComponent={
              <AppText variant="caption" color="textSecondary">
                {!search.trim()
                  ? "고객명 또는 휴대폰번호를 입력해 검색하세요."
                  : pickerSearching
                    ? "검색 중…"
                    : "검색 결과가 없습니다."}
              </AppText>
            }
            renderItem={({ item }) => (
              <Button
                label={`${item.name} · ${formatCustomerPhone(item.phone) || "연락처 없음"}`}
                variant="secondary"
                onPress={() => handlePickCustomer(item.id)}
                loading={createGroup.isPending || addMember.isPending || addLegacy.isPending}
              />
            )}
            contentContainerStyle={styles.pickerContent}
          />
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
        </View>
      </ModalShell>

      <ModalShell
        open={renameTarget != null}
        presentation="dialog"
        dialogHeaderCompact
        title="그룹명 수정"
        onRequestClose={() => setRenameTarget(null)}
        footer={
          <Inline justify="flex-end" gap="xs">
            <Button label="취소" size="sm" variant="secondary" onPress={() => setRenameTarget(null)} />
            <Button label="저장" size="sm" variant="primary" onPress={() => void saveRename()} />
          </Inline>
        }
      >
        <TextField
          label="그룹 이름"
          value={renameTarget?.name ?? ""}
          onChangeText={(name) => setRenameTarget((prev) => (prev ? { ...prev, name } : prev))}
        />
      </ModalShell>

      <ModalShell
        open={labelTarget != null}
        presentation="dialog"
        dialogHeaderCompact
        title="관계 라벨 수정"
        subtitle={labelTarget?.name}
        onRequestClose={() => setLabelTarget(null)}
        footer={
          <Inline justify="flex-end" gap="xs">
            <Button label="취소" size="sm" variant="secondary" onPress={() => setLabelTarget(null)} />
            <Button label="저장" size="sm" variant="primary" onPress={() => void saveLabel()} />
          </Inline>
        }
      >
        <Stack gap="sm">
          <SelectField
            label="관계"
            value={labelOption}
            options={RELATIONSHIP_LABEL_SELECT_OPTIONS}
            onChange={setLabelOption}
          />
          {labelOption === "기타" ? (
            <TextField
              label="관계 직접 입력"
              value={labelCustom}
              onChangeText={setLabelCustom}
              placeholder="관계를 입력해 주세요"
            />
          ) : null}
        </Stack>
      </ModalShell>

      <ConfirmDialog
        open={pendingRemove != null}
        title={
          pendingRemove?.kind === "group"
            ? "그룹 삭제"
            : pendingRemove?.kind === "member"
              ? "그룹 구성원 제거"
              : "연결 해제"
        }
        message={pendingRemove ? `"${pendingRemove.name}"을(를) 해제할까요?` : ""}
        tone="danger"
        confirmLabel="해제"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    groupBlock: {
      paddingVertical: theme.spacing.xs,
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
    memberCardCurrent: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    currentBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.primarySoft,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      paddingLeft: theme.spacing.md,
    },
    chipName: { paddingVertical: theme.spacing.sm, maxWidth: 140 },
    chipRemove: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm },
    pickerBody: { gap: theme.spacing.sm },
    pickerFixed: { flexGrow: 0, flexShrink: 0 },
    row: {
      minHeight: theme.controlSize.md,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    currentRow: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    pickerList: { flex: 1, minHeight: 0 },
    pickerContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  });
}
