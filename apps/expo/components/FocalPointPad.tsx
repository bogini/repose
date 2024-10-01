import React, { useState } from "react";
import { View, StyleSheet, TouchableWithoutFeedback, Text } from "react-native";
import {
  Gesture,
  GestureDetector,
  Directions,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { ViewStyle } from "react-native";

const FOCAL_POINT_SIZE = 20;

interface FocalPointPadProps {
  value?: { x: number; y: number; rotation: number; scale: number };
  onChange?: (value: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }) => void;
  style?: ViewStyle;
}

export const FocalPointPad: React.FC<FocalPointPadProps> = ({
  value = { x: 50, y: 50, rotation: 0, scale: 1 },
  onChange,
  style,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const translateX = useSharedValue(value.x - FOCAL_POINT_SIZE / 2);
  const translateY = useSharedValue(value.y - FOCAL_POINT_SIZE / 2);
  const prevTranslateX = useSharedValue(translateX.value);
  const prevTranslateY = useSharedValue(translateY.value);
  const scale = useSharedValue(value.scale);
  const rotation = useSharedValue(value.rotation);

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

    onChange?.({
      x: translateX.value,
      y: translateY.value,
      rotation: rotation.value,
      scale: scale.value,
    });
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
    rotation.value = event.rotation;
    onChange?.({
      x: translateX.value,
      y: translateY.value,
      rotation: event.rotation,
      scale: scale.value,
    });
  };

  const handleRotationEnd = () => {
    rotation.value = withTiming(value.rotation);
  };

  const handlePinchUpdate = (event: any) => {
    scale.value = event.scale;
    onChange?.({
      x: translateX.value,
      y: translateY.value,
      rotation: rotation.value,
      scale: event.scale,
    });
  };

  const handlePinchEnd = () => {
    scale.value = withTiming(value.scale);
  };

  const handleTap = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const newX = Math.min(
      Math.max(locationX - FOCAL_POINT_SIZE / 2, -FOCAL_POINT_SIZE / 2),
      size.width - FOCAL_POINT_SIZE / 2
    );
    const newY = Math.min(
      Math.max(locationY - FOCAL_POINT_SIZE / 2, -FOCAL_POINT_SIZE / 2),
      size.height - FOCAL_POINT_SIZE / 2
    );

    translateX.value = newX;
    translateY.value = newY;

    onChange?.({
      x: newX + FOCAL_POINT_SIZE / 2,
      y: newY + FOCAL_POINT_SIZE / 2,
      rotation: rotation.value,
      scale: scale.value,
    });
  };

  const handleFlingEnd = (event: any) => {
    const { velocityX, velocityY } = event;
    const flingDistanceX = velocityX * 0.1; // Adjust the multiplier as needed
    const flingDistanceY = velocityY * 0.1; // Adjust the multiplier as needed

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

    onChange?.({
      x: translateX.value,
      y: translateY.value,
      rotation: rotation.value,
      scale: scale.value,
    });
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

  const composedGestures = Gesture.Race(
    panGesture,
    Gesture.Simultaneous(rotationGesture, pinchGesture, flingGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotation.value}rad` },
    ],
  }));

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={composedGestures}>
        <TouchableWithoutFeedback onPress={handleTap}>
          <Animated.View
            style={[styles.pad]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setSize({ width, height });
            }}
          >
            <Animated.View style={[styles.focalPoint, animatedStyle]}>
              <View style={styles.dot} />
              <View style={styles.line} />
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    width: "100%",
    height: "100%",
  },
  pad: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
  },
  focalPoint: {
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

export default FocalPointPad;
