import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { AppText, Button, Card, Screen, Stack, TextField } from '../../design-system';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from './billingApi';
import { redeemNativeCoupon } from './redeemNativeCoupon';
import { formatBillingDate } from './billingModel';

/** Legacy billing deep links expose coupons only on both platforms. */
export function BillingScreen() {
  const { token } = useAuth();
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const summary = useQuery({ queryKey: billingCheckoutSummaryQueryKey, queryFn: () => getCheckoutSummary(token), enabled: Boolean(token) });
  const apply = useMutation({
    mutationFn: async () => {
      const plan = summary.data?.plan?.code ?? 'insurance_basic';
      const cycle = summary.data?.billingCycle ?? 'monthly';
      return redeemNativeCoupon(token, code, plan, cycle);
    },
    onSuccess: async (result) => {
      setNotice(result.message || '쿠폰이 적용되었습니다.');
      setCode('');
      await client.invalidateQueries({ queryKey: ['billing'] });
    },
  });
  return <Screen>
    <AppHeader title="쿠폰 적용" showBack />
    <ScrollView contentContainerStyle={{ padding: 16 }}><Card variant="outlined"><Stack gap="md">
      <AppText variant="heading">쿠폰 적용</AppText>
      {summary.data?.trialEndsAt || summary.data?.currentPeriodEnd ? <AppText>이용 종료일: {formatBillingDate(summary.data.currentPeriodEnd || summary.data.trialEndsAt)}</AppText> : null}
      <TextField label="쿠폰 코드" value={code} autoCapitalize="characters" editable={!apply.isPending} onChangeText={(value) => { setCode(value); setNotice(''); apply.reset(); }} />
      <Button label="적용" disabled={!code.trim() || !summary.data || apply.isPending} onPress={() => { setNotice(''); apply.mutate(); }} />
      {summary.isError ? <AppText color="danger">이용 정보를 불러오지 못했습니다.</AppText> : null}
      {summary.isError ? <Button label="다시 불러오기" variant="secondary" onPress={() => void summary.refetch()} /> : null}
      {apply.error ? <AppText color="danger">{apply.error instanceof Error ? apply.error.message : '쿠폰을 적용하지 못했습니다.'}</AppText> : null}
      {notice ? <AppText accessibilityRole="alert">{notice}</AppText> : null}
    </Stack></Card></ScrollView>
  </Screen>;
}
