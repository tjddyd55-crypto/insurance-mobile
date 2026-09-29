import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  AppText,
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
import {
  resolveCustomerAppAlimtalkError,
  resolveCustomerAppAlimtalkFeedback,
} from "./customerAppShareModel";

/**
 * 고객 상세 업무 패널 상단 — 고객앱 상태 row.
 * 상태 pill + 링크 복사 · 고객앱 발송.
 */
export function CustomerAppLinkStatusRow({
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
  const [noticeTone, setNoticeTone] = useState<"success" | "info" | "error">("success");
  const [busyAction, setBusyAction] = useState<"copy" | "send" | null>(null);

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

  const statusLabel = link.isLoading
    ? "확인 중…"
    : connected
      ? "고객앱 연결됨"
      : "고객앱 미생성";

  const ensureLinkValue = async (): Promise<string> => {
    if (linkValue) return linkValue;
    const created = await createLink.mutateAsync();
    await client.invalidateQueries({ queryKey: ["customer-app-link", customerId] });
    return created.universalUrl || created.connectUrl || "";
  };

  const handleCopy = async () => {
    setBusyAction("copy");
    setNotice("");
    setNoticeTone("success");
    try {
      const value = await ensureLinkValue();
      if (!value) {
        setNotice("링크를 준비하지 못했습니다.");
        setNoticeTone("error");
        return;
      }
      await Clipboard.setStringAsync(value);
      setNotice("링크를 복사했습니다.");
      setNoticeTone("success");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "링크 복사에 실패했습니다.");
      setNoticeTone("error");
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
      const feedback = resolveCustomerAppAlimtalkFeedback(result);
      setNotice(feedback.message);
      setNoticeTone(feedback.tone);
    } catch (error) {
      setNotice(resolveCustomerAppAlimtalkError(error));
      setNoticeTone("error");
    } finally {
      setBusyAction(null);
    }
  };

  const statusPillStyle = link.isLoading
    ? styles.statusPillLoading
    : connected
      ? styles.statusPillConnected
      : styles.statusPillIdle;

  return (
    <View style={styles.wrap} testID="customer-app-compact-row">
      <Inline align="center" gap="xs" style={styles.row}>
        <View style={[styles.statusPill, statusPillStyle]}>
          <AppText
            variant="caption"
            color={connected ? "brandStrong" : "textSecondary"}
            numberOfLines={1}
            style={styles.statusText}
          >
            {statusLabel}
          </AppText>
        </View>
        <Inline gap="xs" style={styles.actions}>
          <Button
            label="링크 복사"
            size="sm"
            variant="secondary"
            loading={busyAction === "copy"}
            disabled={busyAction != null || link.isLoading}
            onPress={() => void handleCopy()}
            style={styles.copyBtn}
          />
          <Button
            label="고객앱 발송"
            size="sm"
            variant="action"
            disabled={busyAction != null || link.isLoading || !phoneReady}
            onPress={() => setSendConfirm(true)}
            style={styles.sendBtn}
          />
        </Inline>
      </Inline>
      {notice ? (
        <AppText
          variant="caption"
          color={noticeTone === "error" ? "danger" : noticeTone === "info" ? "textSecondary" : "success"}
        >
          {notice}
        </AppText>
      ) : null}
      {!phoneReady ? (
        <AppText variant="caption" color="textSecondary">
          연락처가 없으면 고객앱 발송이 제한됩니다.
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

/** @deprecated CustomerAppLinkStatusRow 또는 CustomerDetailTaskPanel 사용 */
export function CustomerAppLinkSection(props: {
  customerId: number;
  customerName: string;
  customerPhone: string;
}) {
  return <CustomerAppLinkStatusRow {...props} />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xxs },
    row: {
      minHeight: theme.controlSize.sm,
      flexWrap: "nowrap",
    },
    statusPill: {
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs + 2,
      borderWidth: 1,
      flexShrink: 1,
      minWidth: 0,
      maxWidth: "42%",
    },
    statusPillIdle: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderColor: theme.colors.border,
    },
    statusPillLoading: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    statusPillConnected: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primaryBorder,
    },
    statusText: {
      fontWeight: "600",
      textAlign: "center",
    },
    actions: {
      marginLeft: "auto",
      flexShrink: 0,
      flexWrap: "nowrap",
    },
    copyBtn: {
      minWidth: 76,
      minHeight: theme.controlSize.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    sendBtn: {
      minWidth: 92,
      minHeight: theme.controlSize.sm,
      paddingHorizontal: theme.spacing.sm,
    },
  });
}
