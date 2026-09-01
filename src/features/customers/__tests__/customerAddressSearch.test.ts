import {
  formatAddressForSave,
  parseAddressFromSave,
} from "../customerAddressSearch";

describe("customerAddressSearch", () => {
  it("Web과 동일한 주소 저장 형식을 사용한다", () => {
    expect(
      formatAddressForSave({
        zonecode: "06236",
        baseAddress: "서울특별시 강남구 테헤란로 152",
        detailAddress: "101호",
      }),
    ).toBe("(06236) 서울특별시 강남구 테헤란로 152 101호");
  });

  it("저장된 주소에서 우편번호를 복원한다", () => {
    expect(
      parseAddressFromSave("(06236) 서울특별시 강남구 테헤란로 152 101호"),
    ).toEqual({
      zonecode: "06236",
      baseAddress: "서울특별시 강남구 테헤란로 152 101호",
      detailAddress: "",
    });
  });
});
