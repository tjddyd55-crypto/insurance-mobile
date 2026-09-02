import { View } from "react-native";

import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Stack,
} from "../../design-system";

export function CustomerClaimConnectionCard({
  customerName,
  linkValue,
  code,
  loading,
  creating,
  onCreate,
  onCopy,
  onShare,
  onSend,
}: {
  customerName: string;
  linkValue: string;
  code: string;
  loading: boolean;
  creating: boolean;
  onCreate: () => void;
  onCopy: (value: string, label: string) => void | Promise<void>;
  onShare: () => void;
  onSend: () => void;
}) {
  const stateLabel = linkValue ? "링크 준비됨" : loading ? "확인 중" : "미연결";

  return (
    <Card variant="outlined">
      <Stack gap="sm">
        <Inline justify="space-between" align="flex-start">
          <View>
            <AppText variant="sectionTitle">고객 앱 연결</AppText>
            <AppText variant="caption">{customerName}</AppText>
          </View>
          <Badge label={stateLabel} tone={linkValue ? "success" : "default"} />
        </Inline>
        {code ? <AppText>연결 코드 {code}</AppText> : null}
        <Inline wrap>
          <Button
            label={linkValue ? "링크 갱신" : "링크 생성"}
            size="sm"
            variant="secondary"
            loading={creating}
            onPress={onCreate}
          />
          <Button
            label="URL 복사"
            size="sm"
            variant="secondary"
            disabled={!linkValue}
            onPress={() => void onCopy(linkValue, "URL")}
          />
          <Button
            label="공유"
            size="sm"
            variant="secondary"
            disabled={!linkValue}
            onPress={onShare}
          />
          <Button
            label="알림톡 발송"
            size="sm"
            variant="secondary"
            disabled={!linkValue}
            onPress={onSend}
          />
        </Inline>
      </Stack>
    </Card>
  );
}
