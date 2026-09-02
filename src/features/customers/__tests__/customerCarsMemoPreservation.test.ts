import { createEmptyCustomerCar } from "../customerCarsModel";
import { formItemToInput } from "../customerCarsSave";

describe("customer car memo preservation", () => {
  it("keeps existing memo in save payload when UI omits memo field", () => {
    const car = {
      ...createEmptyCustomerCar(),
      id: 9,
      carNumber: "12가3456",
      carType: "승용",
      carModel: "쏘나타",
      carYear: "2020",
      renewalDate: "2026-01-01",
      memo: "기존 차량 메모 보존",
      isPrimary: true,
    };

    const payload = formItemToInput(car, true);
    expect(payload.memo).toBe("기존 차량 메모 보존");
    expect(payload.carNumber).toBe("12가3456");
  });

  it("does not blank memo when other fields are edited", () => {
    const car = {
      ...createEmptyCustomerCar(),
      memo: "keep-me",
      carNumber: "99허9999",
    };
    expect(formItemToInput(car, false).memo).toBe("keep-me");
  });
});
