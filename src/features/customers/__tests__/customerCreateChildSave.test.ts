import { persistCustomerCreateChildCollections } from "../customerCreateChildSave";
import type { CustomerFormState } from "../customerForm";
import { saveCustomerCarsForCustomer } from "../customerCarsSave";
import { saveCustomerFireInsuranceLocationsForCustomer } from "../customerFireInsuranceLocationsApi";
import { saveCustomerSpecialDatesForCustomer } from "../customerSpecialDatesApi";
import { saveCustomerCustomFieldsForCustomer } from "../customerCustomFieldsApi";

jest.mock("../customerCarsSave", () => ({
  saveCustomerCarsForCustomer: jest.fn(),
}));
jest.mock("../customerFireInsuranceLocationsApi", () => ({
  saveCustomerFireInsuranceLocationsForCustomer: jest.fn(),
}));
jest.mock("../customerSpecialDatesApi", () => ({
  saveCustomerSpecialDatesForCustomer: jest.fn(),
}));
jest.mock("../customerCustomFieldsApi", () => ({
  saveCustomerCustomFieldsForCustomer: jest.fn(),
}));

describe("persistCustomerCreateChildCollections", () => {
  const queryClient = {
    invalidateQueries: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (saveCustomerCarsForCustomer as jest.Mock).mockResolvedValue(undefined);
    (saveCustomerFireInsuranceLocationsForCustomer as jest.Mock).mockResolvedValue(undefined);
    (saveCustomerSpecialDatesForCustomer as jest.Mock).mockResolvedValue(undefined);
    (saveCustomerCustomFieldsForCustomer as jest.Mock).mockResolvedValue(undefined);
  });

  it("collects partial failures without aborting remaining child saves", async () => {
    (saveCustomerSpecialDatesForCustomer as jest.Mock).mockRejectedValue(
      new Error("special-dates 500"),
    );

    const draft = {
      specialDates: [{ purposeType: "NOTICE" as const, title: "생일", dateValue: "2027-01-20", memo: "" }],
      cars: [],
      fireInsuranceLocations: [],
      customFields: [],
    } as unknown as CustomerFormState;

    const result = await persistCustomerCreateChildCollections({
      token: "token",
      customerId: 711,
      draft,
      queryClient: queryClient as never,
    });

    expect(result.failures).toEqual([
      { resource: "specialDates", message: "special-dates 500" },
    ]);
    expect(saveCustomerCustomFieldsForCustomer).toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
