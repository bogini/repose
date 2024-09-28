import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
  Extrapolation,
  interpolate,
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

  const data = Array.from({ length: numTicks }, (_, i) => i);

  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={10}
        height={16}
        data={data}
        defaultIndex={Math.round(
          ((value - min) / (max - min)) * (numTicks - 1)
        )}
        loop={false}
        onSnapToItem={(index) => handleValueChange(index)}
        renderItem={({ index, animationValue }) => (
          <CarouselItemComponent
            animationValue={animationValue}
            onPress={() => scrollToIndex(index)}
          />
        )}
      />
    </View>
  );
};

interface CarouselItemProps {
  animationValue: Animated.SharedValue<number>;
  onPress: () => void;
}

const CarouselItemComponent = ({
  animationValue,
  onPress,
}: CarouselItemProps) => {
  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  }, [animationValue]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          containerStyle,
        ]}
      >
        <View style={styles.tickMark} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    height: "100%",
    backgroundColor: "#ffffff",
  },
});
