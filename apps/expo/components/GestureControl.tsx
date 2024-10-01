import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableWithoutFeedback, Text } from "react-native";
import {
  Gesture,
  GestureDetector,
  Directions,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { ViewStyle } from "react-native";
import { debounce } from "lodash";

const FOCAL_POINT_SIZE = 34;
const FLING_MULTIPLIER = 0.5;
const DEBOUNCE_TIME_MS = 15;

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

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      translateX.value =
        value.x * (size.width / 2) + size.width / 2 - FOCAL_POINT_SIZE / 2;
      translateY.value =
        -value.y * (size.height / 2) + size.height / 2 - FOCAL_POINT_SIZE / 2;
      rotation.value = value.rotation;
      scale.value = value.scale;
    }
  }, [value, size]);

  const handleValueChange = debounce((source: string) => {
    const x = Number(
      (
        (translateX.value + FOCAL_POINT_SIZE / 2 - size.width / 2) /
        (size.width / 2)
      ).toFixed(2)
    );
    const y = Number(
      (
        -(translateY.value + FOCAL_POINT_SIZE / 2 - size.height / 2) /
        (size.height / 2)
      ).toFixed(2)
    );

    if (!isNaN(x) && !isNaN(y)) {
      const logValue = {
        x,
        y,
        rotation: Number(rotation.value.toFixed(2)),
        scale: Number(scale.value.toFixed(2)),
      };
      onChange?.(logValue);
      //console.log(`onChange called from ${source}`, logValue);
    }
  }, DEBOUNCE_TIME_MS);

  const handlePanUpdate = (event: any) => {
    const maxTranslateX = size.width - FOCAL_POINT_SIZE / 2;
    const maxTranslateY = size.height - FOCAL_POINT_SIZE / 2;

    translateX.value = Math.min(
      Math.max(
        prevTranslateX.value + event.translationX,
        -FOCAL_POINT_SIZE / 2
      ),
      maxTranslateX
    );
    translateY.value = Math.min(
      Math.max(
        prevTranslateY.value + event.translationY,
        -FOCAL_POINT_SIZE / 2
      ),
      maxTranslateY
    );

    handleValueChange("handlePanUpdate");
  };

  const handlePanStart = () => {
    prevTranslateX.value = translateX.value;
    prevTranslateY.value = translateY.value;
  };

  const handlePanEnd = () => {
    value.x += translateX.value;
    value.y += translateY.value;
  };

  const handleRotationUpdate = (event: any) => {
    rotation.value = Math.min(Math.max(event.rotation, -1), 1);
    handleValueChange("handleRotationUpdate");
  };

  const handleRotationEnd = () => {
    value.rotation = rotation.value;
  };

  const handlePinchUpdate = (event: any) => {
    scale.value = Math.min(event.scale, 1);
    handleValueChange("handlePinchUpdate");
  };

  const handlePinchEnd = () => {
    value.scale = scale.value;
  };

  const handleTap = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const newX = (locationX - size.width / 2) / (size.width / 2);
    const newY = -(locationY - size.height / 2) / (size.height / 2);

    translateX.value =
      newX * (size.width / 2) + size.width / 2 - FOCAL_POINT_SIZE / 2;
    translateY.value =
      -newY * (size.height / 2) + size.height / 2 - FOCAL_POINT_SIZE / 2;

    handleValueChange("handleTap");
  };

  const handleFlingEnd = (event: any) => {
    const { velocityX, velocityY } = event;
    const flingDistanceX = velocityX * FLING_MULTIPLIER;
    const flingDistanceY = velocityY * FLING_MULTIPLIER;

    const maxTranslateX = size.width - FOCAL_POINT_SIZE / 2;
    const maxTranslateY = size.height - FOCAL_POINT_SIZE / 2;

    translateX.value = Math.min(
      Math.max(translateX.value + flingDistanceX, -FOCAL_POINT_SIZE / 2),
      maxTranslateX
    );
    translateY.value = Math.min(
      Math.max(translateY.value + flingDistanceY, -FOCAL_POINT_SIZE / 2),
      maxTranslateY
    );

    handleValueChange("handleFlingEnd");
  };

  const handleDoubleTap = () => {
    translateX.value = size.width / 2 - FOCAL_POINT_SIZE / 2;
    translateY.value = size.height / 2 - FOCAL_POINT_SIZE / 2;
    rotation.value = 0;
    scale.value = 0;
    handleValueChange("handleDoubleTap");
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

  const flingGesture = Gesture.Fling()
    .direction(
      Directions.RIGHT | Directions.LEFT | Directions.UP | Directions.DOWN
    )
    .onEnd(handleFlingEnd);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(handleDoubleTap);

  const composedGestures = Gesture.Simultaneous(
    Gesture.Simultaneous(panGesture, pinchGesture, flingGesture),
    rotationGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value + 1 },
      { rotateZ: `${rotation.value}rad` },
    ],
    width: FOCAL_POINT_SIZE,
    height: FOCAL_POINT_SIZE,
  }));

  return (
    <View
      style={[
        styles.container,
        style,
        debug ? { borderColor: "white", borderWidth: 2 } : {},
      ]}
    >
      <GestureDetector gesture={composedGestures}>
        <TouchableWithoutFeedback onPress={handleTap}>
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
              <Animated.View style={[styles.pointContainer, animatedStyle]}>
                <View style={styles.point}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
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
  },
});

export default GestureControl;
