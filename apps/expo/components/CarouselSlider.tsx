import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { debounce } from "lodash";

const DEBOUNCE_TIME_MS = 16;
const SCROLL_DURATION_MS = 350;
const NUM_TICKS = 40;

const data = Array.from({ length: NUM_TICKS }, (_, i) => i);

interface SliderProps {
  min?: number;
  max?: number;
  value?: number;
  onValueChange: (value: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

export const CarouselSlider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  value = 0,
  onValueChange,
  onScrollStart,
  onScrollEnd,
}) => {
  const carouselRef = useRef<ICarouselInstance>(null);

  const scrollToIndex = useCallback((index: number) => {
    if (carouselRef.current?.getCurrentIndex() !== index) {
      carouselRef.current?.scrollTo({
        index,
        animated: true,
      });
    }
  }, []);

  const debouncedScrollToIndex = useMemo(
    () =>
      debounce(scrollToIndex, 5, {
        leading: false,
        trailing: true,
      }),
    [scrollToIndex]
  );

  useEffect(() => {
    const index = Math.round(((value - min) / (max - min)) * (NUM_TICKS - 1));
    debouncedScrollToIndex(index);
  }, [value, min, max, debouncedScrollToIndex]);

  const handleValueChange = useCallback(
    (index: number) => {
      const normalizedValue = (index / (NUM_TICKS - 1)) * (max - min) + min;
      const roundedValue = Math.round(normalizedValue);
      if (roundedValue !== value) {
        onValueChange(roundedValue);
      }
    },
    [max, min, onValueChange]
  );

  const debouncedHandleValueChange = useMemo(
    () =>
      debounce(handleValueChange, DEBOUNCE_TIME_MS, {
        leading: false,
        trailing: true,
      }),
    [handleValueChange]
  );

  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={10}
        height={14}
        defaultIndex={Math.round(
          ((value - min) / (max - min)) * (NUM_TICKS - 1)
        )}
        data={data}
        scrollAnimationDuration={SCROLL_DURATION_MS}
        loop={false}
        onScrollBegin={() => {
          onScrollStart?.();
        }}
        onSnapToItem={(index) => {
          debouncedHandleValueChange(index);
          onScrollEnd?.();
        }}
        onProgressChange={(_, absoluteProgress) => {
          const newIndex = Math.round(absoluteProgress);
          if (carouselRef.current?.getCurrentIndex() !== newIndex) {
            debouncedHandleValueChange(newIndex);
          }
        }}
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

const SliderTick = React.memo(
  ({ animationValue, onPress, isSpecialTick }: CarouselItemProps) => {
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
    }, [animationValue]);

    const tickStyle = useAnimatedStyle(() => {
      const clampedValue = Math.max(-1, Math.min(animationValue.value, 1));
      const backgroundColor = interpolateColor(
        clampedValue,
        [-1, 0, 1],
        ["#FFFFFF", "#FFD409", "#FFFFFF"]
      );

      const opacity = interpolate(
        clampedValue,
        [-1, 0, 1],
        isSpecialTick ? [1, 1, 1] : [0.7, 1, 0.7],
        Extrapolation.CLAMP
      );

      return {
        backgroundColor,
        opacity,
      };
    }, [animationValue, isSpecialTick]);

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
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  carousel: {
    flex: 1,
    width: "220%",
    justifyContent: "center",
    alignItems: "center",
  },
  tickMark: {
    width: 1,
    height: 16,
    opacity: 0.7,
  },
  specialTickMark: {
    opacity: 1,
  },
});
