import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppText, Button, Card, ModalShell, Stack, TextField } from '../../design-system';
import { requestAccountDeletion } from './profileApi';

type Props = { token: string | null; onDeleted: (message: string) => Promise<void> };

/** Reuses the existing Web self-service deletion endpoint without changing its policy. */
export function AccountDeletionSection({ token, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const submitting = useRef(false);
  const valid = ['삭제', '계정삭제'].includes(phrase.trim());
  const close = () => { setOpen(false); setPhrase(''); setError(''); setDiscard(false); };
  const requestClose = () => {
    if (submitting.current) return;
    if (phrase) setDiscard(true);
    else close();
  };
  const submit = async () => {
    if (!valid || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await requestAccountDeletion(token);
      close();
      await onDeleted(result.message || '계정 삭제 요청이 접수되었습니다.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '계정 삭제 요청에 실패했습니다.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return <>
    <Card variant="outlined"><Stack gap="sm">
      <AppText variant="sectionTitle">회원탈퇴</AppText>
      <AppText color="textSecondary">계정과 저장된 고객·상담·파일 등 데이터가 삭제됩니다. 되돌릴 수 없습니다.</AppText>
      <Button label="회원탈퇴" variant="danger" fullWidth onPress={() => setOpen(true)} />
    </Stack></Card>
    <ModalShell open={open} title="회원탈퇴" presentation="dialog" busy={busy}
      closeOnBackdrop={false} dismissOnAndroidBack={false} onRequestClose={requestClose}
      footer={<Stack gap="sm">
        <Button label="계정 삭제 요청" accessibilityLabel="계정 삭제 요청" variant="danger" disabled={!valid || busy} loading={busy} onPress={() => void submit()} />
        <Button label="취소" disabled={busy} onPress={requestClose} />
      </Stack>}>
      <Stack gap="md">
        <AppText>계정과 저장된 고객·상담·파일 등 데이터가 삭제되며, 이 계정으로 더 이상 로그인할 수 없습니다. 정말 탈퇴하시겠습니까?</AppText>
        <TextField label="확인 문구" value={phrase} editable={!busy} placeholder="삭제 또는 계정삭제"
          onChangeText={(value) => { setPhrase(value); setError(''); }} />
        {error ? <AppText color="danger" accessibilityRole="alert">{error}</AppText> : null}
      </Stack>
    </ModalShell>
    <ConfirmDialog open={discard} title="닫기 확인" message="입력한 확인 문구가 사라집니다. 닫으시겠습니까?"
      confirmLabel="닫기" onConfirm={close} onCancel={() => setDiscard(false)} />
  </>;
}
