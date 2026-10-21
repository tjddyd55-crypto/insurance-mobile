import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  AppText,
  Badge,
  Button,
  Inline,
  ModalShell,
  Stack,
} from '../../design-system';
import { customersForContact } from './deviceContactMatch';
import { ALREADY_REGISTERED_CUSTOMER_MESSAGE, buildDeviceContactDialUrl } from './deviceContactRegistration';
import type { CustomerPhoneRef, DeviceContactRecord } from './deviceContactTypes';

const MATCH_LABEL = {
  customer: '고객',
  unregistered: '미등록',
  duplicate: '중복 후보',
} as const;

type DeviceContactDetailModalProps = {
  contact: DeviceContactRecord | null;
  customers: readonly CustomerPhoneRef[];
  alreadyRegistered: boolean;
  candidateNotice: string | null;
  onClose: () => void;
  onCall: (phone: string) => void;
  onSms: (phone: string) => void;
  onOpenCustomer: (customerId: number) => void;
  onRegister: () => void;
  onConfirmAlready: () => void;
  onDismissAlready: () => void;
};

export function DeviceContactDetailModal({
  contact,
  customers,
  alreadyRegistered,
  candidateNotice,
  onClose,
  onCall,
  onSms,
  onOpenCustomer,
  onRegister,
  onConfirmAlready,
  onDismissAlready,
}: DeviceContactDetailModalProps) {
  const candidates = contact ? customersForContact(contact, customers) : [];
  const primaryCandidate = candidates[0];
  const showRegister = contact?.matchedCustomerIds.length === 0;
  return (
    <>
      <ModalShell
        open={contact != null}
        title={contact?.displayName.trim() || '이름 없음'}
        presentation="fullscreen"
        onRequestClose={onClose}
      >
        {contact ? (
          <Stack gap="md">
            <Badge label={MATCH_LABEL[contact.matchState]} tone={contact.matchState === 'duplicate' ? 'warning' : contact.matchState === 'customer' ? 'success' : 'default'} />
            {contact.organization ? <Fact label="회사" value={contact.organization} /> : <Fact label="회사" value="회사 없음" />}
            <AppText variant="caption" color="textSecondary">매칭 상태 · {MATCH_LABEL[contact.matchState]}</AppText>
            {contact.matchState === 'duplicate' ? (
              <AppText variant="caption" color="textSecondary">
                자동으로 합치지 않습니다. 고객이 여러 명이거나 같은 번호의 연락처가 여러 개입니다.
              </AppText>
            ) : null}
            {candidateNotice ? <AppText color="danger">{candidateNotice}</AppText> : null}
            <PhoneList contact={contact} onCall={onCall} onSms={onSms} />
            <CandidateList candidates={candidates} onOpenCustomer={onOpenCustomer} />
            {showRegister ? <Button label="고객으로 등록" variant="primary" onPress={onRegister} /> : null}
            {contact.matchState === 'customer' && primaryCandidate ? (
              <Button label="고객 보기" variant="secondary" onPress={() => onOpenCustomer(primaryCandidate.id)} />
            ) : null}
          </Stack>
        ) : null}
      </ModalShell>
      <ConfirmDialog
        open={alreadyRegistered}
        title={ALREADY_REGISTERED_CUSTOMER_MESSAGE}
        message={ALREADY_REGISTERED_CUSTOMER_MESSAGE}
        confirmLabel="고객 상세로 이동"
        cancelLabel="닫기"
        onConfirm={onConfirmAlready}
        onCancel={onDismissAlready}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <AppText variant="caption" color="textMuted">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </Stack>
  );
}

function PhoneList({
  contact,
  onCall,
  onSms,
}: {
  contact: DeviceContactRecord;
  onCall: (phone: string) => void;
  onSms: (phone: string) => void;
}) {
  return (
    <Stack gap="sm">
      <AppText variant="bodyStrong">전화번호</AppText>
      {contact.phones.map((phone, index) => (
        <PhoneRow key={`${phone}-${index}`} phone={phone} onCall={onCall} onSms={onSms} />
      ))}
    </Stack>
  );
}

function PhoneRow({
  phone,
  onCall,
  onSms,
}: {
  phone: string;
  onCall: (phone: string) => void;
  onSms: (phone: string) => void;
}) {
  const callable = buildDeviceContactDialUrl(phone, 'tel') != null;
  return (
    <Stack gap="xs">
      <AppText variant="body">{phone}</AppText>
      <Inline gap="sm">
        <Button label="전화" size="sm" disabled={!callable} onPress={() => onCall(phone)} />
        <Button label="문자" size="sm" variant="secondary" disabled={!callable} onPress={() => onSms(phone)} />
      </Inline>
    </Stack>
  );
}

function CandidateList({
  candidates,
  onOpenCustomer,
}: {
  candidates: { id: number; name: string }[];
  onOpenCustomer: (customerId: number) => void;
}) {
  if (candidates.length === 0) {
    return null;
  }
  return (
    <Stack gap="sm">
      <AppText variant="bodyStrong">고객 후보</AppText>
      {candidates.map((candidate) => (
        <Button
          key={candidate.id}
          label={`${candidate.name} 보기`}
          variant="secondary"
          onPress={() => onOpenCustomer(candidate.id)}
        />
      ))}
    </Stack>
  );
}
