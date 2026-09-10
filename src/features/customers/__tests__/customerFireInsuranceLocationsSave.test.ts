import {
  createEmptyFireInsuranceLocation,
  normalizeFireInsuranceLocationsForSave,
  planFireInsuranceLocationSync,
  resolveFireInsuranceLocationId,
  type CustomerFireInsuranceLocationRecord,
} from "../customerFireInsuranceLocationsApi";

function rec(
  partial: Partial<CustomerFireInsuranceLocationRecord> & Pick<CustomerFireInsuranceLocationRecord, "id">,
): CustomerFireInsuranceLocationRecord {
  return {
    customerId: 1342,
    address: "",
    memo: "",
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("fire insurance location id preservation", () => {
  it("resolves numeric and numeric-string ids", () => {
    expect(resolveFireInsuranceLocationId(14)).toBe(14);
    expect(resolveFireInsuranceLocationId("15")).toBe(15);
    expect(resolveFireInsuranceLocationId(undefined)).toBeNull();
    expect(resolveFireInsuranceLocationId(0)).toBeNull();
    expect(resolveFireInsuranceLocationId(NaN)).toBeNull();
  });

  it("keeps id on normalize for save", () => {
    const normalized = normalizeFireInsuranceLocationsForSave([
      { id: 11, address: "서울", memo: "본사" },
      { id: "12" as unknown as number, address: "경기", memo: "창고" },
      createEmptyFireInsuranceLocation(),
    ]);
    expect(normalized).toEqual([
      { id: 11, address: "서울", memo: "본사", sortOrder: undefined },
      { id: 12, address: "경기", memo: "창고", sortOrder: undefined },
    ]);
  });

  it("plans PATCH for edited row with same id (no recreate)", () => {
    const current = [
      rec({ id: 11, address: "서울", memo: "본사", sortOrder: 0 }),
      rec({ id: 12, address: "경기", memo: "물류창고", sortOrder: 1 }),
      rec({ id: 14, address: "가로수길", memo: "Native UI 최종 QA", sortOrder: 2 }),
    ];
    const plan = planFireInsuranceLocationSync(
      [
        { id: 11, address: "서울", memo: "본사" },
        { id: 12, address: "경기", memo: "물류창고" },
        { id: 14, address: "가로수길", memo: "Native UI 최종 QA 수정" },
      ],
      current,
    );
    expect(plan.toDelete).toEqual([]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toUpdate).toEqual([
      { id: 14, payload: { address: "가로수길", memo: "Native UI 최종 QA 수정" } },
    ]);
  });

  it("plans PATCH even when form id arrives as string", () => {
    const current = [rec({ id: 14, address: "가로수길", memo: "old", sortOrder: 2 })];
    const plan = planFireInsuranceLocationSync(
      [{ id: "14" as unknown as number, address: "가로수길", memo: "new" }],
      current,
    );
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDelete).toEqual([]);
    expect(plan.toUpdate).toEqual([{ id: 14, payload: { address: "가로수길", memo: "new" } }]);
  });

  it("plans POST for new rows and soft-delete for removed ids", () => {
    const current = [
      rec({ id: 11, address: "서울", memo: "본사", sortOrder: 0 }),
      rec({ id: 12, address: "경기", memo: "물류창고", sortOrder: 1 }),
      rec({ id: 14, address: "가로수길", memo: "Native UI 최종 QA", sortOrder: 2 }),
    ];
    const plan = planFireInsuranceLocationSync(
      [
        { id: 11, address: "서울", memo: "본사" },
        { id: 12, address: "경기", memo: "물류창고" },
      ],
      current,
    );
    expect(plan.toUpdate).toEqual([]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDelete).toEqual([14]);
  });

  it("plans create for rows without id", () => {
    const current = [
      rec({ id: 11, address: "서울", memo: "본사", sortOrder: 0 }),
      rec({ id: 12, address: "경기", memo: "물류창고", sortOrder: 1 }),
    ];
    const plan = planFireInsuranceLocationSync(
      [
        { id: 11, address: "서울", memo: "본사" },
        { id: 12, address: "경기", memo: "물류창고" },
        { address: "가로수길", memo: "Native UI 최종 QA" },
      ],
      current,
    );
    expect(plan.toDelete).toEqual([]);
    expect(plan.toUpdate).toEqual([]);
    expect(plan.toCreate).toEqual([{ address: "가로수길", memo: "Native UI 최종 QA" }]);
  });
});
