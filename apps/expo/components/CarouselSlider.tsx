import React, { useRef, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface SliderProps {
  min?: number;
  max?: number;
  value?: number;
  onValueChange: (value: number) => void;
}

export const CarouselSlider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  value = 0,
  onValueChange,
}) => {
  const numTicks = 50;
  const carouselRef = useRef<ICarouselInstance>(null);
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 150 });
  }, [value]);

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({
      index,
      animated: true,
    });
  };

  const handleValueChange = (index: number) => {
    const normalizedValue = (index / (numTicks - 1)) * (max - min) + min;
    const roundedValue = Math.round(normalizedValue);
    onValueChange(roundedValue);
  };

  const data = useMemo(
    () => Array.from({ length: numTicks }, (_, i) => i),
    [numTicks]
  );

  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={10}
        height={14}
        data={data}
        defaultIndex={Math.round(
          ((value - min) / (max - min)) * (numTicks - 1)
        )}
        loop={false}
        onSnapToItem={(index) => handleValueChange(index)}
        renderItem={({ index, animationValue }) => (
          <SliderTick
            animationValue={animationValue}
            onPress={() => scrollToIndex(index)}
            isSpecialTick={index % 10 === 0 || index === numTicks - 1}
          />
        )}
      />
    </View>
  );
};

interface CarouselItemProps {
  animationValue: Animated.SharedValue<number>;
  onPress: () => void;
  isSpecialTick: boolean;
}

const SliderTick = ({
  animationValue,
  onPress,
  isSpecialTick,
}: CarouselItemProps) => {
  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  const tickStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animationValue.value,
      [-1, 0, 1],
      ["#FFFFFF", "#FFD409", "#FFFFFF"]
    );
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      isSpecialTick ? [1, 1, 1] : [0.7, 1, 0.7],
      Extrapolation.CLAMP
    );

    return {
      backgroundColor,
      opacity,
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          containerStyle,
        ]}
      >
        <Animated.View style={[styles.tickMark, tickStyle]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  carousel: {
    flex: 1,
    width: "200%",
    justifyContent: "center",
    alignItems: "center",
  },
  tickMark: {
    width: 1,
    height: 14,
    opacity: 0.7,
  },
  specialTickMark: {
    opacity: 1,
  },
});
