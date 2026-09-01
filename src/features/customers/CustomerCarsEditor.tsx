import { useMemo } from "react";
import { StyleSheet } from "react-native";

import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  createEmptyCustomerCar,
  prepareCustomerCarsForEditor,
  type CustomerCarFormItem,
} from "./customerCarsModel";

export function CustomerCarsEditor({
  cars,
  onChange,
  disabled = false,
}: {
  cars: CustomerCarFormItem[];
  onChange: (next: CustomerCarFormItem[]) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const list = prepareCustomerCarsForEditor(cars);

  const updateAt = (index: number, next: CustomerCarFormItem) => {
    const copy = [...list];
    copy[index] = next;
    onChange(copy);
  };

  const removeAt = (index: number) => {
    if (list.length <= 1) {
      onChange([{ ...createEmptyCustomerCar(), isPrimary: true }]);
      return;
    }
    onChange(list.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Stack gap="md">
      <Inline justify="space-between">
        <AppText variant="heading">자동차 정보</AppText>
        <Button
          label="자동차 추가"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onPress={() => onChange([...list, createEmptyCustomerCar()])}
        />
      </Inline>
      {list.map((car, index) => (
        <Card key={car.id ?? `car-${index}`} variant="outlined">
          <Stack gap="sm">
            <Inline justify="space-between">
              <AppText variant="bodyStrong">
                {car.isPrimary ? "대표 차량" : `차량 ${index + 1}`}
              </AppText>
              <Inline>
                <Button
                  label={car.isPrimary ? "대표" : "대표 지정"}
                  size="sm"
                  variant={car.isPrimary ? "primary" : "ghost"}
                  disabled={disabled || car.isPrimary}
                  onPress={() =>
                    onChange(
                      list.map((item, itemIndex) => ({
                        ...item,
                        isPrimary: itemIndex === index,
                      })),
                    )
                  }
                />
                <Button
                  label="삭제"
                  size="sm"
                  variant="danger"
                  disabled={disabled}
                  onPress={() => removeAt(index)}
                />
              </Inline>
            </Inline>
            <TextField
              label="차량번호"
              value={car.carNumber}
              onChangeText={(value) => updateAt(index, { ...car, carNumber: value })}
              editable={!disabled}
            />
            <TextField
              label="차종"
              value={car.carType}
              onChangeText={(value) => updateAt(index, { ...car, carType: value })}
              editable={!disabled}
            />
            <TextField
              label="차량 모델"
              value={car.carModel}
              onChangeText={(value) => updateAt(index, { ...car, carModel: value })}
              editable={!disabled}
            />
            <Inline>
              <TextField
                label="연식"
                value={car.carYear}
                onChangeText={(value) => updateAt(index, { ...car, carYear: value })}
                keyboardType="number-pad"
                containerStyle={styles.grow}
                editable={!disabled}
              />
              <TextField
                label="갱신 예정일"
                value={car.renewalDate}
                onChangeText={(value) => updateAt(index, { ...car, renewalDate: value })}
                placeholder="YYYY-MM-DD"
                containerStyle={styles.grow}
                editable={!disabled}
              />
            </Inline>
            <TextField
              label="메모"
              value={car.memo}
              onChangeText={(value) => updateAt(index, { ...car, memo: value })}
              editable={!disabled}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grow: { flex: 1 },
  });
}
