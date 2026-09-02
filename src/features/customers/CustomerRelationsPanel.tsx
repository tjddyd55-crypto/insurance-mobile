import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
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
import { listCustomers } from "./customersApi";
import { formatCustomerPhone } from "./customerModel";
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
  type CustomerRelationGroup,
} from "./customerRelationGroupsApi";
import { selectFamilyGroups } from "./customerRelationPresentation";
import {
  RELATIONSHIP_LABEL_SELECT_OPTIONS,
  resolveRelationshipLabel,
} from "./relationshipLabel";
import { customerDetailPath } from "./customerWorkspaceNavigation";
import { CollapsibleDetailSection } from "./CollapsibleDetailSection";

type PickerMode =
  | { kind: "legacy-add" }
  | { kind: "family-create" }
  | { kind: "family-add-member"; groupId: number }
  | null;

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
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(token),
    enabled: Boolean(token) && picker != null,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-relation-groups", customerId] }),
      queryClient.invalidateQueries({ queryKey: ["customer-relations", customerId] }),
    ]);
  };

  const createGroup = useMutation({
    mutationFn: async (member: { customerId: number; relationshipLabel: string }) => {
      const name = groupName.trim() || "가족";
      return createCustomerRelationGroup(token, customerId, {
        name,
        groupType: "FAMILY",
        members: [member],
      });
    },
    onSuccess: async () => {
      setPicker(null);
      setGroupName("");
      setNotice("가족 그룹을 만들었습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "가족 그룹 생성 실패"),
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
      setNotice("가족 구성원을 추가했습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "가족 추가 실패"),
  });

  const addLegacy = useMutation({
    mutationFn: (relatedCustomerId: number) =>
      createCustomerRelation(token, customerId, relatedCustomerId),
    onSuccess: async () => {
      setPicker(null);
      setNotice("관계자를 연결했습니다.");
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "관계자 연결 실패"),
  });

  const familyGroups = selectFamilyGroups(groupsQuery.data ?? []);
  const primaryFamily: CustomerRelationGroup | null = familyGroups[0] ?? null;

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
    const query = search.trim().toLowerCase();
    const phoneQuery = query.replace(/\D/g, "");
    return (customersQuery.data?.customers ?? [])
      .filter((row) => !excludedIds.has(row.id))
      .filter((row) => {
        if (!query) return true;
        return (
          row.name.toLowerCase().includes(query) ||
          row.phone.replace(/\D/g, "").includes(phoneQuery)
        );
      })
      .slice(0, 80);
  }, [customersQuery.data?.customers, excludedIds, search]);

  const openRelated = (relatedId: number) => {
    if (relatedId === customerId) return;
    router.push(customerDetailPath(relatedId) as Href);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    try {
      if (pendingRemove.kind === "legacy") {
        await deleteCustomerRelation(token, customerId, pendingRemove.relatedCustomerId);
        setNotice("관계자를 해제했습니다.");
      } else if (pendingRemove.kind === "member") {
        await removeCustomerRelationGroupMember(
          token,
          pendingRemove.groupId,
          pendingRemove.customerId,
        );
        setNotice("가족 구성원을 제외했습니다.");
      } else {
        await deleteCustomerRelationGroup(token, pendingRemove.groupId);
        setNotice("가족 그룹을 해제했습니다.");
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

  return (
    <>
      <CollapsibleDetailSection title="가족" testID="customer-detail-section-family">
        <Inline justify="space-between" align="center">
          <AppText variant="caption" color="textSecondary">
            {primaryFamily ? primaryFamily.name : "등록된 가족 그룹이 없습니다."}
          </AppText>
          {primaryFamily ? (
            <Inline gap="xs">
              <Button
                label="구성원 추가"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setLabelOption("배우자");
                  setLabelCustom("");
                  setPicker({ kind: "family-add-member", groupId: primaryFamily.id });
                }}
              />
              <Button
                label="그룹 해제"
                size="sm"
                variant="ghost"
                onPress={() =>
                  setPendingRemove({
                    kind: "group",
                    groupId: primaryFamily.id,
                    name: primaryFamily.name,
                  })
                }
              />
            </Inline>
          ) : (
            <Button
              label="가족 그룹 만들기"
              size="sm"
              variant="secondary"
              onPress={() => {
                setGroupName("가족");
                setLabelOption("배우자");
                setLabelCustom("");
                setPicker({ kind: "family-create" });
              }}
            />
          )}
        </Inline>
        {groupsQuery.isLoading ? (
          <AppText variant="caption">가족 그룹을 불러오는 중…</AppText>
        ) : primaryFamily ? (
          primaryFamily.members.map((member) => (
            <Pressable
              key={`${primaryFamily.id}-${member.customerId}`}
              accessibilityRole="button"
              onPress={() => openRelated(member.customerId)}
              style={[styles.row, member.isCurrentCustomer && styles.currentRow]}
            >
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">
                  {member.name}
                  {member.isCurrentCustomer ? " · 현재" : ""}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {member.relationshipLabel || "관계 미지정"}
                  {member.phone
                    ? ` · ${formatCustomerPhone(member.phone)}`
                    : ""}
                </AppText>
              </View>
              {!member.isCurrentCustomer ? (
                <Button
                  label="제외"
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    setPendingRemove({
                      kind: "member",
                      groupId: primaryFamily.id,
                      customerId: member.customerId,
                      name: member.name,
                    })
                  }
                />
              ) : null}
            </Pressable>
          ))
        ) : null}
      </CollapsibleDetailSection>

      <CollapsibleDetailSection title="관계자" testID="customer-detail-section-relations">
        <Inline justify="flex-end">
          <Button
            label="관계자 추가"
            size="sm"
            variant="secondary"
            onPress={() => setPicker({ kind: "legacy-add" })}
          />
        </Inline>
        {relationsQuery.isLoading ? (
          <AppText variant="caption">관계자를 불러오는 중…</AppText>
        ) : relationsQuery.data?.length ? (
          relationsQuery.data.map((relation) => (
            <Pressable
              key={relation.relatedCustomerId}
              accessibilityRole="button"
              onPress={() => openRelated(relation.relatedCustomerId)}
              style={styles.row}
            >
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">{relation.relatedName}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {relation.relatedPhone
                    ? formatCustomerPhone(relation.relatedPhone)
                    : "연락처 없음"}
                </AppText>
              </View>
              <Button
                label="해제"
                size="sm"
                variant="ghost"
                onPress={() =>
                  setPendingRemove({
                    kind: "legacy",
                    relatedCustomerId: relation.relatedCustomerId,
                    name: relation.relatedName,
                  })
                }
              />
            </Pressable>
          ))
        ) : (
          <AppText variant="caption" color="textSecondary">
            연결된 관계자가 없습니다.
          </AppText>
        )}
      </CollapsibleDetailSection>

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

      <ModalShell
        open={picker != null}
        title={
          picker?.kind === "legacy-add"
            ? "관계자 추가"
            : picker?.kind === "family-create"
              ? "가족 그룹 만들기"
              : "가족 구성원 추가"
        }
        onRequestClose={() => setPicker(null)}
        headerAction={
          <Button label="닫기" size="sm" variant="ghost" onPress={() => setPicker(null)} />
        }
      >
        <Stack gap="md">
          {picker?.kind === "family-create" ? (
            <TextField
              label="그룹 이름"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="예: 우리 가족"
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
            placeholder="이름 또는 연락처"
            autoFocus
          />
          <FlatList
            data={pickerRows}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.pickerList}
            ListEmptyComponent={
              <AppText variant="caption" color="textSecondary">
                {customersQuery.isLoading ? "고객을 불러오는 중…" : "선택 가능한 고객이 없습니다."}
              </AppText>
            }
            renderItem={({ item }) => (
              <Button
                label={`${item.name} · ${formatCustomerPhone(item.phone) || "연락처 없음"}`}
                variant="secondary"
                onPress={() => handlePickCustomer(item.id)}
                loading={
                  createGroup.isPending || addMember.isPending || addLegacy.isPending
                }
              />
            )}
            contentContainerStyle={styles.pickerContent}
          />
        </Stack>
      </ModalShell>

      <ConfirmDialog
        open={pendingRemove != null}
        title={
          pendingRemove?.kind === "group"
            ? "가족 그룹 해제"
            : pendingRemove?.kind === "member"
              ? "가족 구성원 제외"
              : "관계자 해제"
        }
        message={
          pendingRemove
            ? `"${pendingRemove.name}"을(를) 해제할까요?`
            : ""
        }
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
    row: {
      minHeight: theme.controlSize.md,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    currentRow: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    pickerList: { maxHeight: 360 },
    pickerContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  });
}
