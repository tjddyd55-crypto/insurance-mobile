import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { returnToSectionParent } from "../../navigation/sectionNavigation";

type AppRouter = ReturnType<typeof useRouter>;

export function customerDetailPath(customerId: number): `/customers/${number}` {
  return `/customers/${customerId}`;
}

export function customersListPath(): "/customers" {
  return "/customers";
}

/**
 * 고객 하위 화면 → 고객 상세(parent). customers Stack 안에서 dismissTo:
 * 상세가 Stack 아래에 있으면 거기까지 pop, 없으면(딥링크) 현재 화면을 상세로 바꾼다.
 * Drawer 에서 replace 하지 않는다(Drawer history 에 이전 화면이 남아 back 루프가 생긴다).
 */
export function navigateToCustomerDetail(
  router: Pick<AppRouter, "dismissTo">,
  customerId: number,
): void {
  returnToSectionParent(router, customerDetailPath(customerId));
}

/**
 * 고객 상세의 parent는 고객 리스트(customers Stack 의 initialRoute).
 * dismissTo 로 리스트까지 pop 한다. 리스트에서의 back 은 Drawer history(직전 화면)로 간다.
 */
export function goBackFromCustomerDetail(
  router: Pick<AppRouter, "dismissTo">,
): void {
  returnToSectionParent(router, customersListPath());
}

export function isCustomerDetailBackEnabled(
  customerId: number,
  options?: { enabled?: boolean },
): boolean {
  if (options?.enabled === false) {
    return false;
  }
  return Number.isFinite(customerId) && customerId > 0;
}

/**
 * 고객 sub-route(파일/청구/지도 등) → 고객 상세.
 * Header/Android back 공통. focus 중에만 hardware back을 가로챈다.
 * customerId가 없으면(0/null 컨텍스트) BackHandler를 등록하지 않는다.
 */
export function useCustomerDetailBack(
  customerId: number,
  options?: { enabled?: boolean },
) {
  const router = useRouter();
  const backEnabled = isCustomerDetailBackEnabled(customerId, options);
  const onBack = useCallback(() => {
    if (!backEnabled) {
      return;
    }
    navigateToCustomerDetail(router, customerId);
  }, [backEnabled, customerId, router]);

  useFocusEffect(
    useCallback(() => {
      if (!backEnabled) {
        return undefined;
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateToCustomerDetail(router, customerId);
        return true;
      });
      return () => sub.remove();
    }, [backEnabled, customerId, router]),
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
