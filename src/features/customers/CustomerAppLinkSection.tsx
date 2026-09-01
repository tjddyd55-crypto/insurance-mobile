import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AppText } from "../../design-system";
import {
  createCustomerAppLink,
  getCustomerAppLink,
  sendCustomerAppAlimtalk,
} from "../claims/claimsApi";
import { CustomerClaimConnectionCard } from "../claims/CustomerClaimConnectionCard";

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
  const [sendConfirm, setSendConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const link = useQuery({
    queryKey: ["customer-app-link", customerId],
    queryFn: () => getCustomerAppLink(token, customerId),
    enabled: Boolean(token),
  });
  const createLink = useMutation({
    mutationFn: () => createCustomerAppLink(token, customerId),
    onSuccess: async () => {
      setNotice("고객 앱 연결 링크를 준비했습니다.");
      await client.invalidateQueries({
        queryKey: ["customer-app-link", customerId],
      });
    },
  });
  const sendLink = useMutation({
    mutationFn: () => sendCustomerAppAlimtalk(token, customerId),
    onSuccess: (result) => {
      setSendConfirm(false);
      setNotice(
        result.status === "sent"
          ? `${result.receiverMasked ?? "고객"}에게 연결 알림톡을 발송했습니다.`
          : `발송 결과: ${result.status}`,
      );
    },
  });
  const linkValue = link.data?.universalUrl || link.data?.connectUrl || "";
  const code = link.data?.agentCode || link.data?.linkCode || "";

  return (
    <>
      <CustomerClaimConnectionCard
        customerName={customerName}
        linkValue={linkValue}
        code={code}
        loading={link.isLoading}
        creating={createLink.isPending}
        onCreate={() => createLink.mutate()}
        onCopy={async (value, label) => {
          if (!value) return;
          await Clipboard.setStringAsync(value);
          setNotice(`${label}를 복사했습니다.`);
        }}
        onShare={async () => {
          if (!linkValue) return;
          await Share.share({
            title: "ONE FC 고객 보험청구 연결",
            message: linkValue,
            url: linkValue,
          });
        }}
        onSend={() => setSendConfirm(true)}
      />
      {notice ? (
        <AppText variant="caption" color="success">
          {notice}
        </AppText>
      ) : null}
      {!customerPhone.trim() ? (
        <AppText variant="caption" color="textSecondary">
          연락처가 없으면 문자·알림톡 발송이 제한됩니다.
        </AppText>
      ) : null}
      <ConfirmDialog
        open={sendConfirm}
        title="고객앱 링크 알림톡 발송"
        message={`${customerName} 고객에게 고객앱 연결 알림톡을 발송하시겠습니까?`}
        confirmLabel="발송"
        busy={sendLink.isPending}
        onCancel={() => setSendConfirm(false)}
        onConfirm={() => sendLink.mutateAsync()}
      />
    </>
  );
}
