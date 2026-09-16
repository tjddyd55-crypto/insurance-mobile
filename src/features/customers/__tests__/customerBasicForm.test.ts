import { customerBasicFormToPayload, customerToForm } from "../customerForm";
import {
  assertCustomerBusinessInfoPersisted,
  buildCustomerBusinessInfoUpdatePayload,
} from "../customersApi";
import type { CustomerRecord } from "../types";

const existing: CustomerRecord = {
  id: 1,
  userId: "u1",
  name: "박성현",
  ssn: "9001011234567",
  gender: "male",
  phone: "01012345678",
  birthDate: "1990-01-01",
  carrier: "skt",
  height: "175",
  weight: "70",
  address: "(13494) 경기도 성남시",
  job: "회사원",
  driving: "",
  medical: "",
  isDriver: true,
  carType: "",
  carNumber: "",
  carModel: "",
  carYear: "",
  renewalDate: "",
  nextAgeDate: null,
  insuranceAge: 35,
  inflowSource: null,
  referrerName: null,
  notes: {
    items: [{ id: "n1", content: "legacy", createdAt: "2026-01-01" }],
    insuranceHistory: "기존",
    accountNumber: "111",
    treatmentHistoryNote: "수술",
    medicationHistoryNote: "약",
  },
  isFavorite: false,
  smsOptOut: false,
  businessInfo: {
    representativeName: "대표",
    businessNumber: "123",
    businessAddress: "서울",
    memo: "메모",
  },
  fireInsuranceLocations: [],
  createdAt: "",
};

describe("customerBasicFormToPayload", () => {
  it("core customer 필드만 포함하고 businessInfo는 제외한다", () => {
    const form = customerToForm(existing);
    form.name = "박성현2";
    form.insuranceHistory = "변경";

    const payload = customerBasicFormToPayload(form, existing);

    expect(payload.name).toBe("박성현2");
    expect(payload.notes?.insuranceHistory).toBe("변경");
    expect(payload.notes?.items).toEqual([
      { id: "n1", content: "legacy", createdAt: "2026-01-01" },
    ]);
    expect(payload).not.toHaveProperty("businessInfo");
    expect(payload).not.toHaveProperty("carType");
  });
});

describe("buildCustomerBusinessInfoUpdatePayload", () => {
  it("사업자 저장 시 name과 businessInfo를 함께 전송한다", () => {
    const payload = buildCustomerBusinessInfoUpdatePayload(existing, {
      representativeName: "대표2",
      businessNumber: "123-45-67890",
      businessAddress: "(06236) 서울 강남구 101호",
      memo: "",
    });

    expect(payload).toEqual({
      name: "박성현",
      businessInfo: {
        representativeName: "대표2",
        businessNumber: "123-45-67890",
        businessAddress: "(06236) 서울 강남구 101호",
        memo: "",
      },
    });
  });

  it("빈 사업자 정보는 null로 전송한다", () => {
    const payload = buildCustomerBusinessInfoUpdatePayload(existing, {
      representativeName: "",
      businessNumber: "",
      businessAddress: "",
      memo: "",
    });

    expect(payload.businessInfo).toBeNull();
  });

  it("저장 응답에 businessInfo가 없으면 실패한다", () => {
    expect(() =>
      assertCustomerBusinessInfoPersisted(
        {
          representativeName: "대표2",
          businessNumber: "123",
          businessAddress: "서울",
          memo: "",
        },
        { ...existing, businessInfo: null },
      ),
    ).toThrow("사업자 정보를 저장하지 못했습니다.");
  });

  it("저장 응답 businessInfo가 payload와 일치하면 통과한다", () => {
    const sent = {
      representativeName: "대표2",
      businessNumber: "123-45-67890",
      businessAddress: "(06236) 서울",
      memo: "메모",
    };
    expect(() =>
      assertCustomerBusinessInfoPersisted(sent, {
        ...existing,
        businessInfo: sent,
      }),
    ).not.toThrow();
  });
});
