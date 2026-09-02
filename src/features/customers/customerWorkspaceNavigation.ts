import { useCallback } from "react";
import { useRouter, type Href } from "expo-router";

type AppRouter = ReturnType<typeof useRouter>;

export function customerDetailPath(customerId: number): `/customers/${number}` {
  return `/customers/${customerId}`;
}

export function navigateToCustomerDetail(
  router: Pick<AppRouter, "replace">,
  customerId: number,
): void {
  router.replace(customerDetailPath(customerId) as Href);
}

export function useCustomerDetailBack(customerId: number) {
  const router = useRouter();
  return useCallback(() => {
    navigateToCustomerDetail(router, customerId);
  }, [customerId, router]);
}
