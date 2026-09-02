import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

type AppRouter = ReturnType<typeof useRouter>;

export function customerDetailPath(customerId: number): `/customers/${number}` {
  return `/customers/${customerId}`;
}

export function customersListPath(): "/customers" {
  return "/customers";
}

export function navigateToCustomerDetail(
  router: Pick<AppRouter, "replace">,
  customerId: number,
): void {
  router.replace(customerDetailPath(customerId) as Href);
}

/**
 * 고객 상세의 parent는 고객 리스트.
 * Drawer/history 오염으로 router.back()이 엉뚱한 곳으로 가지 않게 replace 사용.
 */
export function goBackFromCustomerDetail(
  router: Pick<AppRouter, "replace">,
): void {
  router.replace(customersListPath() as Href);
}

/**
 * 고객 sub-route(파일/청구/지도 등) → 고객 상세.
 * Header/Android back 공통. focus 중에만 hardware back을 가로챈다.
 */
export function useCustomerDetailBack(customerId: number) {
  const router = useRouter();
  const onBack = useCallback(() => {
    navigateToCustomerDetail(router, customerId);
  }, [customerId, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateToCustomerDetail(router, customerId);
        return true;
      });
      return () => sub.remove();
    }, [customerId, router]),
  );

  return onBack;
}

/**
 * 고객 상세 Header Back + Android system back 공통 정책.
 * focus 중에만 등록해 하위 라우트가 떠 있을 때 리스트로 뺏기지 않게 한다.
 */
export function useGoBackFromCustomerDetail() {
  const router = useRouter();
  const onBack = useCallback(() => {
    goBackFromCustomerDetail(router);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBackFromCustomerDetail(router);
        return true;
      });
      return () => sub.remove();
    }, [router]),
  );

  return onBack;
}
