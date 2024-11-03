import { StyleSheet, Text, View } from "react-native";
import { FaceControl, FaceValues, GestureDirection } from "../lib/faceControl";
import GestureControl, { GestureControlValue } from "./GestureControl";
import { ImageContainer } from "./ImageContainer";
import { useCallback, useMemo } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";

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

const DISABLED_MARGINS = [
  "https://pb5bgngllwiflhmq.public.blob.vercel-storage.com/photos/1727809492353-RjR7qgJno8CcATO0ipIc7dFK4y3g6Q.webp", // inigo jr.
];

export const FaceGestureControl = ({
  imageUrl,
  faceValues,
  onFaceValuesChange,
  originalImageUrl,
  selectedControl,
  loading = false,
  debug = false,
}: FaceControlsComponentProps) => {
  const handleGestureValueChange = useCallback(
    ({ x, y, rotation, scale }: GestureControlValue) => {
      const updatedFaceValues = { ...faceValues };

      selectedControl.values.forEach(
        ({ key, min, max, gesture, direction, linkedValues }) => {
          const gestureValues = { x, y, rotation, scale };
          const value = gestureValues[gesture];
          if (value === undefined) return;

          const normalizedValue = (value + 1) * ((max - min) / 2) + min;
          const finalValue =
            direction === GestureDirection.Inverted
              ? max - (normalizedValue - min)
              : normalizedValue;

          const roundedValue = Math.round(finalValue);

          // Only update if the value has actually changed
          if (updatedFaceValues[key] !== roundedValue) {
            updatedFaceValues[key] = roundedValue;

            // Update linked values
            linkedValues?.forEach(({ key, factor }) => {
              updatedFaceValues[key] = roundedValue * factor;
            });
          }
        }
      );

      onFaceValuesChange(updatedFaceValues);
    },
    [faceValues, selectedControl.values, onFaceValuesChange]
  );

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
      margins={!DISABLED_MARGINS.includes(originalImageUrl ?? "")}
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

          <Animated.View
            layout={LinearTransition.duration(50)}
            style={styles.selectedControlLabelContainer}
          >
            <Text style={styles.selectedControlLabel}>
              {loading ? "PROCESSING" : selectedControl.label}
            </Text>
          </Animated.View>
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
  selectedControlLabelContainer: {
    position: "absolute",
    bottom: 10,
    backgroundColor: "black",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
    flex: 1,
    alignContent: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  selectedControlLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "thin",
  },
});
