import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  AppText,
  Badge,
  Button,
  Inline,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  createCustomerAppLink,
  getCustomerAppLink,
  sendCustomerAppAlimtalk,
} from "../claims/claimsApi";
import { listCustomerAppCompactActions } from "./customerAppActions";

/**
 * Customer Workspace 전용 compact 고객앱 row.
 * 노출 액션: 링크 복사 · 알림톡 (생성/공유 CTA 없음 — 필요 시 내부 ensure).
 */
export function CustomerAppLinkSection({
  customerId,
  customerName,
  customerPhone,
}: {
  customerId: number;
  customerName: string;
  customerPhone: string;
}) {
  const { token } = useAuth();
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState<"copy" | "send" | null>(null);
  const actionLabels = listCustomerAppCompactActions();

  const link = useQuery({
    queryKey: ["customer-app-link", customerId],
    queryFn: () => getCustomerAppLink(token, customerId),
    enabled: Boolean(token),
  });

  const createLink = useMutation({
    mutationFn: () => createCustomerAppLink(token, customerId),
  });

  const sendLink = useMutation({
    mutationFn: () => sendCustomerAppAlimtalk(token, customerId),
  });

  const linkValue = link.data?.universalUrl || link.data?.connectUrl || "";
  const connected = Boolean(linkValue);
  const phoneReady = Boolean(customerPhone.trim());

  const ensureLinkValue = async (): Promise<string> => {
    if (linkValue) return linkValue;
    const created = await createLink.mutateAsync();
    await client.invalidateQueries({ queryKey: ["customer-app-link", customerId] });
    return created.universalUrl || created.connectUrl || "";
  };

  const handleCopy = async () => {
    setBusyAction("copy");
    setNotice("");
    try {
      const value = await ensureLinkValue();
      if (!value) {
        setNotice("링크를 준비하지 못했습니다.");
        return;
      }
      await Clipboard.setStringAsync(value);
      setNotice("링크를 복사했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "링크 복사에 실패했습니다.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendConfirm = async () => {
    setBusyAction("send");
    try {
      await ensureLinkValue();
      const result = await sendLink.mutateAsync();
      setSendConfirm(false);
      setNotice(
        result.status === "sent"
          ? `${result.receiverMasked ?? "고객"}에게 연결 알림톡을 발송했습니다.`
          : `발송 결과: ${result.status}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "알림톡 발송에 실패했습니다.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={styles.wrap} testID="customer-app-compact-row">
      <Inline align="center" gap="sm" style={styles.row}>
        <Inline align="center" gap="xs" style={styles.labelBlock}>
          <AppText variant="bodyStrong">고객앱</AppText>
          <Badge
            label={
              link.isLoading ? "확인 중" : connected ? "연결됨" : "미연결"
            }
            tone={connected ? "success" : "default"}
          />
        </Inline>
        <Inline gap="xs" style={styles.actions}>
          <Button
            label={actionLabels[0]}
            size="sm"
            variant="secondary"
            loading={busyAction === "copy"}
            disabled={busyAction != null || link.isLoading}
            onPress={() => void handleCopy()}
            style={styles.actionBtn}
          />
          <Button
            label={actionLabels[1]}
            size="sm"
            variant="secondary"
            disabled={
              busyAction != null || link.isLoading || !phoneReady
            }
            onPress={() => setSendConfirm(true)}
            style={styles.actionBtn}
          />
        </Inline>
      </Inline>
      {notice ? (
        <AppText variant="caption" color="success">
          {notice}
        </AppText>
      ) : null}
      {!phoneReady ? (
        <AppText variant="caption" color="textSecondary">
          연락처가 없으면 알림톡 발송이 제한됩니다.
        </AppText>
      ) : null}
      <ConfirmDialog
        open={sendConfirm}
        title="고객앱 링크 알림톡 발송"
        message={`${customerName} 고객에게 고객앱 연결 알림톡을 발송하시겠습니까?`}
        confirmLabel="발송"
        busy={busyAction === "send" || sendLink.isPending}
        onCancel={() => setSendConfirm(false)}
        onConfirm={() => void handleSendConfirm()}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    row: {
      minHeight: theme.controlSize.md,
      flexWrap: "nowrap",
    },
    labelBlock: { flexShrink: 1, minWidth: 0 },
    actions: { marginLeft: "auto", flexShrink: 0 },
    actionBtn: { minWidth: 88 },
  });
}
