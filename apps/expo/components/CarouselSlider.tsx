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
import { debounce } from "lodash";

const DEBOUNCE_TIME_MS = 25;
const NUM_TICKS = 40;
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
  const carouselRef = useRef<ICarouselInstance>(null);

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({
      index,
      animated: true,
    });
  };

  const handleValueChange = (index: number) => {
    const normalizedValue = (index / (NUM_TICKS - 1)) * (max - min) + min;
    const roundedValue = Math.round(normalizedValue);
    if (roundedValue !== value) {
      onValueChange(roundedValue);
    }
  };

  const debouncedHandleValueChange = useMemo(
    () => debounce(handleValueChange, DEBOUNCE_TIME_MS),
    [handleValueChange]
  );

  const data = useMemo(
    () => Array.from({ length: NUM_TICKS }, (_, i) => i),
    [NUM_TICKS]
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
          ((value - min) / (max - min)) * (NUM_TICKS - 1)
        )}
        loop={false}
        onScrollEnd={(index) => handleValueChange(index)}
        onProgressChange={(_offsetProgress, absoluteProgress) =>
          debouncedHandleValueChange(absoluteProgress)
        }
        renderItem={({ index, animationValue }) => (
          <SliderTick
            animationValue={animationValue}
            onPress={() => scrollToIndex(index)}
            isSpecialTick={index % 10 === 0 || index === NUM_TICKS - 1}
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
