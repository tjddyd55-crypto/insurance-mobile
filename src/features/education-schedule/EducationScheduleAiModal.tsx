import { useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { FlatList, Keyboard, Platform, StyleSheet, View } from 'react-native';

import { describeApiError } from '../../api/apiErrorCopy';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppText, Button, Card, Inline, KeyboardAwareModal, Stack, TextField, useAppTheme } from '../../design-system';
import { normalizeDateInput } from '../../utils/dateInput';
import {
  analyzeEducationImage,
  bulkRegisterEducationSchedules,
  confirmEducationImageMonth,
  type AnalysisResult,
  type BulkResult,
  type ScheduleInput,
} from './educationScheduleApi';
import {
  buildReviewRows,
  EDUCATION_MONTH_PATTERN,
  emptyScheduleInput,
  isReviewDuplicate,
  MAX_REVIEW_ROWS,
  scheduleInputError,
  selectedReviewInputs,
  toggleAllReviewRows,
  type ReviewRow,
} from './educationScheduleModel';
import { EducationScheduleFields } from './EducationScheduleForm';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
type Operation = 'pick' | 'analyze' | 'confirm' | 'register';
type RegistrationResult = BulkResult & { inputs: ScheduleInput[] };

function cleanImageCache(uri: string) {
  if (Platform.OS === 'web') return;
  try {
    const copy = new File(uri);
    if (copy.exists) copy.delete();
  } catch {
    // The picker created a cache copy. The OS can reclaim it if immediate deletion fails.
  }
}

export function EducationScheduleAiModal({ token, onClose, onRegistered }: {
  token: string;
  onClose: () => void;
  onRegistered: () => void;
}) {
  const theme = useAppTheme();
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [yearMonth, setYearMonth] = useState('');
  const [result, setResult] = useState<RegistrationResult>();
  const [busy, setBusy] = useState<Operation>();
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const operation = useRef<Operation | undefined>(undefined);
  const nextManualId = useRef(-1);
  const selection = selectedReviewInputs(rows);
  const needsMonth = analysis?.needsYearMonthConfirm === true;

  function selectOperation(kind: Operation | undefined) {
    operation.current = kind;
    setBusy(kind);
  }

  async function perform(kind: Operation, action: () => Promise<void>) {
    if (operation.current) return;
    selectOperation(kind);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(describeApiError(err, '교육일정 요청을 처리하지 못했습니다.'));
    } finally {
      selectOperation(undefined);
    }
  }

  function applyAnalysis(data: AnalysisResult) {
    if (!Array.isArray(data.rows) || !Array.isArray(data.excluded) || (data.needsYearMonthConfirm && !data.draft)) {
      throw new Error('이미지 분석 결과를 불러오지 못했습니다.');
    }
    setRows(buildReviewRows(data.rows));
    setAnalysis(data);
    setYearMonth(data.yearMonth ?? '');
  }

  function chooseImage() {
    void perform('pick', async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: IMAGE_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      try {
        const [asset] = picked.assets;
        if (!asset || picked.assets.length !== 1) throw new Error('달력 이미지 한 장을 선택해 주세요.');
        if (asset.size != null && (asset.size <= 0 || asset.size > MAX_IMAGE_BYTES)) {
          throw new Error('파일 크기는 1바이트~20 MB여야 합니다.');
        }
        selectOperation('analyze');
        applyAnalysis(await analyzeEducationImage(token, asset));
      } finally {
        for (const asset of picked.assets) cleanImageCache(asset.uri);
      }
    });
  }

  function confirmMonth() {
    const draft = analysis?.draft;
    if (!draft || !EDUCATION_MONTH_PATTERN.test(yearMonth)) return;
    Keyboard.dismiss();
    void perform('confirm', async () => applyAnalysis(await confirmEducationImageMonth(token, yearMonth, draft)));
  }

  function updateRow(id: number, changes: Partial<ReviewRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  function addRow() {
    if (!analysis?.yearMonth || rows.length >= MAX_REVIEW_ROWS) return;
    const row = {
      ...emptyScheduleInput(`${analysis.yearMonth}-01`),
      id: nextManualId.current--, day: null, selected: true, reviewReasons: [],
    };
    setRows((current) => [row, ...current]);
  }

  function register() {
    if (needsMonth || result || operation.current) return;
    if (!selection.length || selection.length > MAX_REVIEW_ROWS) {
      setError(`등록할 일정을 1~${MAX_REVIEW_ROWS}건 선택해 주세요.`);
      return;
    }
    const invalid = selection.findIndex((row) => scheduleInputError(row));
    if (invalid !== -1) {
      setError(`선택한 일정 중 ${invalid + 1}번째 항목을 확인해 주세요. ${scheduleInputError(selection[invalid])}`);
      return;
    }
    Keyboard.dismiss();
    void perform('register', async () => {
      const response = await bulkRegisterEducationSchedules(token, selection);
      if (!Array.isArray(response.results) || response.results.length !== selection.length) {
        throw new Error('일괄등록 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
      }
      setResult({ ...response, inputs: selection });
      onRegistered();
    });
  }

  function requestClose() {
    if (operation.current) return;
    if (analysis && !result) {
      Keyboard.dismiss();
      setConfirmClose(true);
    } else {
      onClose();
    }
  }

  const listHeader = (
    <Stack gap="md">
      {!analysis ? (
        <>
          <AppText color="textSecondary">JPG, JPEG, PNG, WEBP 이미지 1장 · 최대 20 MB</AppText>
          {busy === 'analyze' ? <AppText accessibilityLiveRegion="polite">달력 이미지를 분석 중입니다…</AppText> : null}
          <Button label="이미지 선택" variant="primary" disabled={Boolean(busy)} onPress={chooseImage} />
        </>
      ) : null}
      {needsMonth ? (
        <>
          <AppText>인식된 연월 · {analysis?.year ? `${analysis.year}년` : '연도 미확인'} / {analysis?.month ? `${analysis.month}월` : '월 미확인'}</AppText>
          <TextField
            label="이미지의 연월"
            placeholder="YYYY-MM"
            keyboardType="number-pad"
            value={yearMonth}
            editable={!busy}
            onChangeText={(value) => setYearMonth(normalizeDateInput(value).slice(0, 7))}
          />
          <Button label="연월 확인" disabled={Boolean(busy) || !EDUCATION_MONTH_PATTERN.test(yearMonth)} loading={busy === 'confirm'} onPress={confirmMonth} />
        </>
      ) : null}
      {analysis?.excluded.length ? (
        <Stack gap="xs">
          <AppText variant="bodyStrong">공휴일로 제외된 항목</AppText>
          {analysis.excluded.map(({ date, text }, index) => (
            <AppText key={`${date}-${index}`} color="danger">{date} {text}</AppText>
          ))}
        </Stack>
      ) : null}
      {analysis && !result && !needsMonth ? (
        <>
          <AppText variant="bodyStrong">{analysis.yearMonth} 교육일정 검토</AppText>
          {!rows.length ? <AppText color="textSecondary">검토할 교육일정이 없습니다.</AppText> : null}
          <Inline gap="xs" wrap>
            <Button label="전체 선택" size="sm" disabled={Boolean(busy) || !rows.length} onPress={() => setRows((current) => toggleAllReviewRows(current, true))} />
            <Button label="전체 해제" size="sm" disabled={Boolean(busy) || !selection.length} onPress={() => setRows((current) => toggleAllReviewRows(current, false))} />
            <Button label="직접 추가" size="sm" disabled={Boolean(busy) || rows.length >= MAX_REVIEW_ROWS} onPress={addRow} />
          </Inline>
        </>
      ) : null}
      {result ? <AppText variant="sectionTitle" accessibilityLiveRegion="polite">등록 {result.created}건 · 중복 {result.duplicate}건</AppText> : null}
    </Stack>
  );

  return (
    <KeyboardAwareModal
      visible
      animationType="slide"
      onRequestClose={requestClose}
      footer={
        <>
          {error ? <AppText color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
          <Inline gap="sm" justify="flex-end" wrap>
            <Button label={result ? '닫기' : '취소'} disabled={Boolean(busy)} onPress={requestClose} />
            {analysis && !needsMonth && !result ? (
              <Button
                label={`선택 일괄등록 (${selection.length}건)`}
                variant="primary"
                loading={busy === 'register'}
                disabled={Boolean(busy) || !selection.length}
                onPress={register}
              />
            ) : null}
          </Inline>
        </>
      }
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={{ padding: theme.layout.modalPadding }}>
          <AppText variant="sectionTitle">AI 이미지 등록</AppText>
        </View>
        {result ? (
          <FlatList
            data={result.inputs}
            keyExtractor={(_, index) => String(index)}
            ListHeaderComponent={listHeader}
            contentContainerStyle={{ gap: theme.spacing.sm, padding: theme.layout.modalPadding }}
            renderItem={({ item, index }) => (
              <Card variant="outlined" padding="sm">
                <AppText color={result.results[index]?.status === 'created' ? 'textSecondary' : 'danger'}>
                  {result.results[index]?.status === 'created' ? '등록 완료' : '중복'} · {item.date}
                </AppText>
                <AppText variant="bodyStrong">{item.title}</AppText>
                {item.instructor ? <AppText color="textSecondary">{item.instructor}</AppText> : null}
              </Card>
            )}
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.id)}
            ListHeaderComponent={listHeader}
            contentContainerStyle={{ gap: theme.spacing.sm, padding: theme.layout.modalPadding }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item: row, index }) => (
              <Card variant="outlined" padding="sm">
                <Stack gap="sm">
                  {needsMonth ? (
                    <>
                      <AppText variant="bodyStrong">{row.title}</AppText>
                      <AppText color="textSecondary">{row.day ? `${row.day}일` : '교육일자 확인 필요'}</AppText>
                      {row.instructor ? <AppText color="textSecondary">{row.instructor}</AppText> : null}
                    </>
                  ) : (
                    <>
                      <Inline justify="space-between">
                        <Button
                          label={row.selected ? '선택됨' : '선택'}
                          variant={row.selected ? 'selected' : 'secondary'}
                          accessibilityLabel={`${index + 1}번째 일정 ${row.selected ? '선택 해제' : '선택'}`}
                          accessibilityState={{ selected: row.selected, disabled: Boolean(busy) }}
                          size="sm"
                          disabled={Boolean(busy)}
                          onPress={() => updateRow(row.id, { selected: !row.selected })}
                        />
                        <Button label="제외" accessibilityLabel={`${index + 1}번째 일정 제외`} size="sm" disabled={Boolean(busy)} onPress={() => setRows((current) => current.filter((item) => item.id !== row.id))} />
                      </Inline>
                      <EducationScheduleFields value={row} disabled={Boolean(busy)} onChange={(value) => updateRow(row.id, value)} />
                    </>
                  )}
                  {isReviewDuplicate(row) ? <AppText color="danger">중복 후보</AppText> : null}
                  {row.reviewReasons.length ? <AppText color="textSecondary">검토 필요 · {row.reviewReasons.join(' ')}</AppText> : null}
                </Stack>
              </Card>
            )}
          />
        )}
        <ConfirmDialog
          open={confirmClose}
          title="AI 이미지 등록 닫기"
          message="검토 중인 일정을 저장하지 않고 닫을까요?"
          confirmLabel="닫기"
          cancelLabel="계속 검토"
          onCancel={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      </View>
    </KeyboardAwareModal>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
