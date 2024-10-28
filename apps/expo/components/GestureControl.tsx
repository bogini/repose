import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Gesture,
  GestureDetector,
  TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withDecay,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { ViewStyle } from "react-native";
import { debounce } from "lodash";
import { NUM_BUCKETS } from "../api/replicate";
import * as Haptics from "expo-haptics";

const FOCAL_POINT_SIZE = 34;

export interface GestureControlValue {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface GestureControlProps {
  value?: GestureControlValue;
  onChange?: (value: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }) => void;
  style?: ViewStyle;
  debug?: boolean;
  children?: React.ReactNode;
}

export const GestureControl: React.FC<GestureControlProps> = ({
  value = { x: 0, y: 0, rotation: 0, scale: 0 },
  onChange,
  style,
  debug = false,
  children,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const prevTranslateX = useSharedValue(translateX.value);
  const prevTranslateY = useSharedValue(translateY.value);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const isGestureActive = useSharedValue(false);
  const isDecayActiveX = useSharedValue(false);
  const isDecayActiveY = useSharedValue(false);

  const marginSizeX = size.width / NUM_BUCKETS / 1.5;
  const marginSizeY = size.height / NUM_BUCKETS / 1.5;

  useAnimatedReaction(
    () => {
      return value;
    },
    (currentValue, previousValue) => {
      if (
        currentValue !== previousValue &&
        size.width > 0 &&
        size.height > 0 &&
        !isGestureActive.value
      ) {
        translateX.value =
          currentValue.x * (size.width / 2) +
          size.width / 2 -
          FOCAL_POINT_SIZE / 2;
        translateY.value =
          -currentValue.y * (size.height / 2) +
          size.height / 2 -
          FOCAL_POINT_SIZE / 2;
        rotation.value = currentValue.rotation;
        scale.value = currentValue.scale;
      }
    },
    [value, size]
  );

  // const debouncedOnChange = useMemo(
  //   () =>
  //     debounce((values: GestureControlValue) => {
  //       onChange?.(values);
  //     }, DEBOUNCE_TIME_MS),
  //   [onChange]
  // );

  const handleValueChange = useCallback(
    (source: string) => {
      if (!size.width || !size.height) return;

      // Calculate normalized values (-1 to 1)
      const x = Number(
        (
          (translateX.value - (size.width / 2 - FOCAL_POINT_SIZE / 2)) /
          (size.width / 2)
        ).toFixed(2)
      );
      const y = Number(
        (
          -(translateY.value - (size.height / 2 - FOCAL_POINT_SIZE / 2)) /
          (size.height / 2)
        ).toFixed(2)
      );

      if (
        !isNaN(x) &&
        !isNaN(y) &&
        !isNaN(rotation.value) &&
        !isNaN(scale.value) &&
        x >= -1 &&
        x <= 1 &&
        y >= -1 &&
        y <= 1
      ) {
        const values = {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          rotation: Number(rotation.value.toFixed(2)),
          scale: Number(scale.value.toFixed(2)),
        };

        // console.log(source, values);
        onChange?.(values);
      }
    },
    [size, onChange, translateX, translateY, rotation, scale]
  );

  const debouncedHandleValueChange = useMemo(
    () =>
      debounce((source: string) => {
        handleValueChange(source);
      }, 10),
    [handleValueChange]
  );

  const handlePanStart = () => {
    isGestureActive.value = true;
    isDecayActiveX.value = false;
    isDecayActiveY.value = false;
    prevTranslateX.value = translateX.value;
    prevTranslateY.value = translateY.value;
  };

  const debouncedHaptics = useMemo(
    () =>
      debounce(
        (velocity: number) => {
          if (velocity < 500) {
            Haptics.selectionAsync();
          } else if (velocity < 1000) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (velocity < 2000) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        },
        100,
        {
          leading: true,
          trailing: false,
        }
      ),
    []
  );

  const handlePanUpdate = (event: any) => {
    const minTranslateX = -FOCAL_POINT_SIZE / 2;
    const minTranslateY = -FOCAL_POINT_SIZE / 2;
    const maxTranslateX = size.width - FOCAL_POINT_SIZE / 2;
    const maxTranslateY = size.height - FOCAL_POINT_SIZE / 2;

    translateX.value = Math.max(
      minTranslateX,
      Math.min(maxTranslateX, event.translationX + prevTranslateX.value)
    );
    translateY.value = Math.max(
      minTranslateY,
      Math.min(maxTranslateY, event.translationY + prevTranslateY.value)
    );

    const minTranslateXMargin = -FOCAL_POINT_SIZE / 2 + marginSizeX;
    const minTranslateYMargin = -FOCAL_POINT_SIZE / 2 + marginSizeY;
    const maxTranslateXMargin = size.width - FOCAL_POINT_SIZE / 2 - marginSizeX;
    const maxTranslateYMargin =
      size.height - FOCAL_POINT_SIZE / 2 - marginSizeY;

    if (
      event.translationX + prevTranslateX.value <= minTranslateXMargin ||
      event.translationX + prevTranslateX.value >= maxTranslateXMargin ||
      event.translationY + prevTranslateY.value <= minTranslateYMargin ||
      event.translationY + prevTranslateY.value >= maxTranslateYMargin
    ) {
      debouncedHaptics(
        Math.max(Math.abs(event.velocityX), Math.abs(event.velocityY))
      );
    }

    debouncedHandleValueChange("handlePanUpdate");
  };

  const handlePanEnd = (event: any) => {
    debouncedHandleValueChange.cancel();

    const minTranslateX = -FOCAL_POINT_SIZE / 2 + marginSizeX;
    const minTranslateY = -FOCAL_POINT_SIZE / 2 + marginSizeY;
    const maxTranslateX = size.width - FOCAL_POINT_SIZE / 2 - marginSizeX;
    const maxTranslateY = size.height - FOCAL_POINT_SIZE / 2 - marginSizeY;

    isDecayActiveX.value = true;
    isDecayActiveY.value = true;

    translateX.value = withDecay({
      velocity: event.velocityX,
      clamp: [minTranslateX, maxTranslateX],
      deceleration: 0.99,
      velocityFactor: 1,
      rubberBandEffect: true,
      rubberBandFactor: 2,
    });

    translateY.value = withDecay({
      velocity: event.velocityY,
      clamp: [minTranslateY, maxTranslateY],
      deceleration: 0.99,
      velocityFactor: 1,
      rubberBandEffect: true,
      rubberBandFactor: 2,
    });
  };

  const handleRotationUpdate = (event: any) => {
    isGestureActive.value = true;
    rotation.value = Math.min(Math.max(event.rotation, -1), 1);
    debouncedHandleValueChange("handleRotationUpdate");
  };

  const handleRotationEnd = () => {
    handleValueChange("handleRotationEnd");
    isGestureActive.value = false;
  };

  const handlePinchUpdate = (event: any) => {
    isGestureActive.value = true;
    scale.value = Math.min(Math.max(event.scale - 1, -1), 1);
    debouncedHandleValueChange("handlePinchUpdate");
  };

  const handlePinchEnd = () => {
    handleValueChange("handlePinchEnd");
    isGestureActive.value = false;
  };

  const handleTapStart = (event: TapGestureHandlerEventPayload) => {
    isGestureActive.value = true;
    const { x: locationX, y: locationY } = event;

    const newX = (locationX - size.width / 2) / (size.width / 2);
    const newY = -(locationY - size.height / 2) / (size.height / 2);

    const calculateNewPosition = (value: number, size: number) =>
      value * (size / 2) + size / 2 - FOCAL_POINT_SIZE / 2;

    const targetX = calculateNewPosition(newX, size.width);
    const targetY = calculateNewPosition(-newY, size.height);

    const distance = Math.sqrt(
      Math.pow(targetX - translateX.value, 2) +
        Math.pow(targetY - translateY.value, 2)
    );

    isDecayActiveX.value = true;
    isDecayActiveY.value = true;

    translateX.value = withTiming(targetX, {
      duration: Math.min(distance * 1, 1000),
    });

    translateY.value = withTiming(targetY, {
      duration: Math.min(distance * 1, 1000),
    });
  };

  const handleTapEnd = () => {
    // handleValueChange("handleTapEnd");
    // isGestureActive.value = false;
  };

  const handleDoubleTapStart = () => {
    isGestureActive.value = true;
    translateX.value = size.width / 2 - FOCAL_POINT_SIZE / 2;
    translateY.value = size.height / 2 - FOCAL_POINT_SIZE / 2;
    rotation.value = 0;
    scale.value = 0;
  };

  const handleDoubleTapEnd = () => {
    handleValueChange("handleDoubleTapEnd");
    isGestureActive.value = false;
  };

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart(handlePanStart)
    .onUpdate(handlePanUpdate)
    .onEnd(handlePanEnd);

  const rotationGesture = Gesture.Rotation()
    .onUpdate(handleRotationUpdate)
    .onEnd(handleRotationEnd);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(handlePinchUpdate)
    .onEnd(handlePinchEnd);

  const tapGesture = Gesture.Tap().onStart(handleTapStart).onEnd(handleTapEnd);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onStart(handleDoubleTapStart)
    .onEnd(handleDoubleTapEnd);

  const composedGestures = Gesture.Race(
    Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture),
    Gesture.Exclusive(doubleTapGesture, tapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isNaN(translateX.value) ? 0 : translateX.value },
      { translateY: isNaN(translateY.value) ? 0 : translateY.value },
      { scale: isNaN(scale.value) ? 1 : scale.value + 1 },
      { rotateZ: isNaN(rotation.value) ? "0rad" : `${rotation.value}rad` },
    ],
    width: FOCAL_POINT_SIZE,
    height: FOCAL_POINT_SIZE,
  }));

  // Handle decay updates
  useAnimatedReaction(
    () => {
      return {
        x: translateX.value,
        y: translateY.value,
      };
    },
    (current, previous) => {
      if (
        (isDecayActiveX.value || isDecayActiveY.value) &&
        previous &&
        (current.x !== previous.x || current.y !== previous.y)
      ) {
        // Check if change is very small (less than 0.1 pixels)
        const deltaX = Math.abs(current.x - previous.x);
        const deltaY = Math.abs(current.y - previous.y);

        if (deltaX < 0.1) {
          isDecayActiveX.value = false;
        }

        if (deltaY < 0.1) {
          isDecayActiveY.value = false;
        }

        runOnJS(debouncedHandleValueChange)("decay");
      }
    },
    [debouncedHandleValueChange]
  );

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={composedGestures}>
        <Animated.View
          style={[styles.surface]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setSize({ width, height });

            translateX.value = width / 2 - FOCAL_POINT_SIZE / 2;
            translateY.value = height / 2 - FOCAL_POINT_SIZE / 2;
          }}
        >
          {children}
          {debug && (
            <>
              <View
                style={[
                  styles.marginContainer,
                  { borderWidth: marginSizeX }, // Apply dynamic margin size
                ]}
              ></View>
              <Animated.View
                style={[styles.pointContainer, animatedStyle]}
                pointerEvents="none"
              >
                <View style={styles.point}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                </View>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  surface: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  pointContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  point: {
    width: FOCAL_POINT_SIZE,
    height: FOCAL_POINT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    zIndex: 1,
    width: FOCAL_POINT_SIZE,
    height: FOCAL_POINT_SIZE,
    borderRadius: FOCAL_POINT_SIZE / 2,
    backgroundColor: "blue",
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    position: "absolute",
    width: 2,
    height: "100%",
    backgroundColor: "white",
    zIndex: 1,
  },
  marginContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderColor: "rgba(1,1,1,0.1)",
    borderStyle: "solid",
  },
  marginHorizontal: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  marginVertical: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
});

export default GestureControl;
