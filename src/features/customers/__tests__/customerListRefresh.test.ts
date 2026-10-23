// @ts-nocheck
import { QueryClient } from '@tanstack/react-query';

import { customerQueryKeys, invalidateCustomerListQueries } from '../queryKeys';

describe('customer create/delete → list refresh (server SSOT)', () => {
  function seeded() {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    client.setQueryData(customerQueryKeys.list({}), { total: 1, customers: [] });
    client.setQueryData(customerQueryKeys.list({ limit: 50 } as never), { total: 1, customers: [] });
    client.setQueryData(customerQueryKeys.all, { total: 1, customers: [] });
    client.setQueryData(customerQueryKeys.detail(5), { id: 5 });
    client.setQueryData(['customer-relation-groups', 5], []);
    return client;
  }
  const stale = (c: QueryClient, key: readonly unknown[]) => c.getQueryState(key)?.isInvalidated;

  it('invalidates every customers.list(*) query and the picker list, nothing else', async () => {
    const client = seeded();
    await invalidateCustomerListQueries(client);
    expect(stale(client, customerQueryKeys.list({}))).toBe(true);
    expect(stale(client, customerQueryKeys.list({ limit: 50 } as never))).toBe(true);
    expect(stale(client, customerQueryKeys.all)).toBe(true);
    expect(stale(client, customerQueryKeys.detail(5))).toBe(false);
    expect(stale(client, ['customer-relation-groups', 5])).toBe(false);
    // no global clear: data still cached until refetch
    expect(client.getQueryData(customerQueryKeys.detail(5))).toEqual({ id: 5 });
  });

  it('create/delete screens use the list invalidation instead of local append/filter', () => {
    const fs = require('fs');
    const path = require('path');
    const form = fs.readFileSync(path.join(__dirname, '../CustomerFormScreen.tsx'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '../CustomerDetailScreen.tsx'), 'utf8');
    expect(form).toMatch(/savedMode === 'create'\) \{\s*\/\/[^\n]*\n\s*void invalidateCustomerListQueries\(queryClient\);/);
    expect(detail).toMatch(/deleteCustomer\(token, idToDelete\)[\s\S]*invalidateCustomerListQueries\(queryClient\)/);
    expect(detail).not.toMatch(/previous\.customers\.filter\(\(item\) => item\.id !== idToDelete\)/);
    expect(form).not.toMatch(/queryClient\.clear\(\)/);
  });
});
