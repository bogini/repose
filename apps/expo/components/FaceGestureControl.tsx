import { StyleSheet, Text, View } from "react-native";
import { FaceControl, FaceValues, GestureDirection } from "../lib/faceControl";
import GestureControl, { GestureControlValue } from "./GestureControl";
import { ImageContainer } from "./ImageContainer";
import { useMemo } from "react";

interface FaceControlsComponentProps {
  faceValues: FaceValues;
  onFaceValuesChange: (values: FaceValues) => void;
  selectedControl: FaceControl;
  imageUrl?: string;
  originalImageUrl?: string;
  placeholderImageUrl?: string;
  loading?: boolean;
  debug?: boolean;
}

export const FaceGestureControl = ({
  imageUrl,
  faceValues,
  onFaceValuesChange,
  originalImageUrl,
  selectedControl,
  loading = false,
  debug = false,
}: FaceControlsComponentProps) => {
  const handleGestureValueChange = ({
    x,
    y,
    rotation,
    scale,
  }: GestureControlValue) => {
    const updatedFaceValues = { ...faceValues };

    selectedControl.values.forEach(({ key, min, max, gesture, direction }) => {
      let value;
      switch (gesture) {
        case "x":
          value = x;
          break;
        case "y":
          value = y;
          break;
        case "rotation":
          value = rotation;
          break;
        case "scale":
          value = scale;
          break;
        default:
          return;
      }

      // Normalize the value based on min and max
      const normalizedValue = (value + 1) * ((max - min) / 2) + min;

      // Invert the value if direction is inverted
      const finalValue =
        direction === GestureDirection.Inverted
          ? max - (normalizedValue - min)
          : normalizedValue;

      const roundedValue = Math.round(finalValue);

      updatedFaceValues[key] = roundedValue;
    });

    onFaceValuesChange(updatedFaceValues);
  };

  const gestureControlValue = useMemo(() => {
    const gestureValues = selectedControl.values.reduce(
      (acc, { key, min, max, direction, gesture }) => {
        const value = faceValues[key] ?? 0;
        const normalizedValue = (value - min) / (max - min);
        const invertedValue = 1 - normalizedValue;
        const finalValue =
          direction === GestureDirection.Inverted
            ? invertedValue
            : normalizedValue;
        const scaledValue = finalValue * 2 - 1;
        acc[gesture] = scaledValue;
        return acc;
      },
      {} as { [key: string]: number }
    );

    return { x: 0, y: 0, rotation: 0, scale: 0, ...gestureValues };
  }, [faceValues, selectedControl]);

  return (
    <GestureControl
      debug={debug}
      value={gestureControlValue}
      onChange={handleGestureValueChange}
    >
      {imageUrl && (
        <View style={styles.faceGestureControlContainer}>
          <ImageContainer
            loading={loading}
            detectFace={true}
            imageUrl={imageUrl}
            debug={debug}
            originalImageUrl={originalImageUrl}
            selectedControl={selectedControl.key}
          />
          <Text style={styles.selectedControlLabel}>
            {selectedControl.label}
          </Text>
        </View>
      )}
    </GestureControl>
  );
};

const styles = StyleSheet.create({
  faceGestureControlContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  selectedControlLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "thin",
    textAlign: "center",
    position: "absolute",
    bottom: 10,
    backgroundColor: "black",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
  },
});
