import {
  formatAddressForSave,
  parseAddressFromSave,
  type AddressSearchValue,
} from "../../features/customers/customerAddressSearch";

/**
 * SavedAddressSearchField의 핵심 binding 규칙을 단위 검증한다.
 * (상세주소 입력 시 parent 문자열 round-trip으로 base가 오염되지 않음)
 */
function simulateSavedAddressBinding() {
  let savedAddress = "";
  let localValue: AddressSearchValue = parseAddressFromSave(savedAddress);
  let lastEmitted = savedAddress;

  const onSavedAddressChange = (next: string) => {
    lastEmitted = next;
    savedAddress = next;
  };

  const applyExternalSavedAddress = (next: string) => {
    if (next === lastEmitted) return;
    lastEmitted = next;
    savedAddress = next;
    localValue = parseAddressFromSave(savedAddress);
  };

  const handleChange = (next: AddressSearchValue) => {
    localValue = next;
    const formatted = formatAddressForSave(next);
    lastEmitted = formatted;
    onSavedAddressChange(formatted);
    applyExternalSavedAddress(formatted);
  };

  return {
    getLocalValue: () => localValue,
    getSavedAddress: () => savedAddress,
    handleChange,
    applyExternalSavedAddress,
  };
}

describe("SavedAddressSearchField binding", () => {
  it("검색 선택 후 상세주소 입력 시 base/detail이 분리 유지된다", () => {
    const binding = simulateSavedAddressBinding();

    binding.handleChange({
      zonecode: "13494",
      baseAddress: "경기도 성남시 분당구 판교역로 166",
      detailAddress: "",
    });
    binding.handleChange({
      zonecode: "13494",
      baseAddress: "경기도 성남시 분당구 판교역로 166",
      detailAddress: "101동 202호",
    });

    expect(binding.getLocalValue()).toEqual({
      zonecode: "13494",
      baseAddress: "경기도 성남시 분당구 판교역로 166",
      detailAddress: "101동 202호",
    });
    expect(binding.getSavedAddress()).toBe(
      "(13494) 경기도 성남시 분당구 판교역로 166 101동 202호",
    );
  });

  it("parent re-render 시 자체 emit 값으로는 local state를 리셋하지 않는다", () => {
    const binding = simulateSavedAddressBinding();

    binding.handleChange({
      zonecode: "13494",
      baseAddress: "경기도 성남시 분당구 판교역로 166",
      detailAddress: "101동",
    });
    binding.applyExternalSavedAddress(binding.getSavedAddress());

    expect(binding.getLocalValue().detailAddress).toBe("101동");
    expect(binding.getLocalValue().baseAddress).toBe(
      "경기도 성남시 분당구 판교역로 166",
    );
  });
});
