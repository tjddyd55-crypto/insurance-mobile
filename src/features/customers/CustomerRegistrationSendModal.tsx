import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { ApiError } from '../../api/client';
import { ModalCloseButton } from '../../components/ModalCloseButton';
import {
  AppText,
  Button,
  Inline,
  ModalShell,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  applyFormInputFormat,
  PHONE_INPUT_MAX_LENGTH,
  PHONE_INPUT_PLACEHOLDER,
  stripPhoneFormatting,
} from '../../utils/inputFormatters';
import {
  digitsOnlyPhone,
  resolveCustomerRegistrationAlimtalkError,
  resolveCustomerRegistrationAlimtalkFeedback,
  resolveCustomerRegistrationCopySuccessMessage,
  resolveCustomerRegistrationPhoneError,
} from './customerRegistrationShareModel';
import { getCustomerRegistrationLink, sendCustomerRegistrationAlimtalk } from './customersApi';

type CustomerRegistrationSendModalProps = {
  open: boolean;
  token: string | null;
  /** 고객 상세 등에서 전달. 목록 화면은 비워 둔다. */
  prefilledPhone?: string;
  onClose: () => void;
  onFeedback: (message: string) => void;
};

export function CustomerRegistrationSendModal({
  open,
  token,
  prefilledPhone = '',
  onClose,
  onFeedback,
}: CustomerRegistrationSendModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [phone, setPhone] = useState('');
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const [inlineMessage, setInlineMessage] = useState('');
  const [inlineTone, setInlineTone] = useState<'success' | 'info' | 'error'>('info');

  const busy = copying || sending;
  const hasPhoneInput = digitsOnlyPhone(phone).length > 0;
  const phoneError = resolveCustomerRegistrationPhoneError(phone, hasPhoneInput);

  useEffect(() => {
    if (!open) {
      return;
    }
    setInlineMessage('');
    const initial = prefilledPhone.trim();
    setPhone(initial ? applyFormInputFormat('phone', initial) : '');
  }, [open, prefilledPhone]);

  const showInline = (message: string, tone: 'success' | 'info' | 'error') => {
    setInlineMessage(message);
    setInlineTone(tone);
  };

  const handleCopy = async () => {
    setCopying(true);
    setInlineMessage('');
    try {
      const url = await getCustomerRegistrationLink(token);
      await Clipboard.setStringAsync(url);
      const message = resolveCustomerRegistrationCopySuccessMessage();
      showInline(message, 'success');
      onFeedback(message);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '고객등록 링크를 만들 수 없습니다.';
      showInline(message, 'error');
      onFeedback(message);
    } finally {
      setCopying(false);
    }
  };

  const handleSendAlimtalk = async () => {
    if (phoneError) {
      showInline(phoneError, 'error');
      return;
    }
    setSending(true);
    setInlineMessage('');
    try {
      const result = await sendCustomerRegistrationAlimtalk(token, stripPhoneFormatting(phone));
      const feedback = resolveCustomerRegistrationAlimtalkFeedback(result);
      showInline(feedback.message, feedback.tone);
      onFeedback(feedback.message);
      if (feedback.closeModal) {
        onClose();
      }
    } catch (error) {
      const message = resolveCustomerRegistrationAlimtalkError(error);
      showInline(message, 'error');
      onFeedback(message);
    } finally {
      setSending(false);
    }
  };

  const requestClose = () => {
    if (!busy) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      title="고객등록 발송"
      presentation="dialog"
      scroll={false}
      keyboardAvoiding
      busy={busy}
      closeOnBackdrop={false}
      dismissOnAndroidBack={!busy}
      dialogHeaderCompact
      dialogBodyPadding={theme.spacing.lg}
      onRequestClose={requestClose}
      headerAction={<ModalCloseButton onPress={requestClose} />}
    >
      <Stack gap="lg" style={styles.body}>
        <AppText color="textSecondary">
          휴대폰번호를 입력한 뒤 링크를 복사하거나 카카오톡으로 고객등록 링크를 발송할 수 있습니다.
        </AppText>
        <TextField
          label="휴대폰번호"
          value={phone}
          onChangeText={(value) => setPhone(applyFormInputFormat('phone', value))}
          placeholder={PHONE_INPUT_PLACEHOLDER}
          maxLength={PHONE_INPUT_MAX_LENGTH}
          keyboardType="phone-pad"
          autoComplete="tel"
          editable={!busy}
          accessibilityLabel="휴대폰번호"
        />
        <Inline gap="sm">
          <Button
            label="링크 복사"
            variant="secondary"
            loading={copying}
            disabled={busy}
            onPress={() => void handleCopy()}
            style={styles.actionBtn}
          />
          <Button
            label="카카오톡 발송"
            variant="action"
            loading={sending}
            disabled={busy}
            onPress={() => void handleSendAlimtalk()}
            style={styles.actionBtn}
          />
        </Inline>
        {inlineMessage ? (
          <AppText
            variant="caption"
            color={inlineTone === 'error' ? 'danger' : inlineTone === 'success' ? 'success' : 'textSecondary'}
          >
            {inlineMessage}
          </AppText>
        ) : null}
      </Stack>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      alignSelf: 'stretch',
    },
    actionBtn: {
      flex: 1,
      minWidth: 0,
    },
  });
}
