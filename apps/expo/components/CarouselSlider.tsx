import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { debounce } from "lodash";

const DEBOUNCE_TIME_MS = 15;
const SCROLL_DURATION_MS = 500;
const NUM_TICKS = 40;

interface SliderProps {
  min?: number;
  max?: number;
  value?: number;
  onValueChange: (value: number) => void;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;
}

export const CarouselSlider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  value = 0,
  onValueChange,
  onScrollBegin,
  onScrollEnd,
}) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const isScrolling = useSharedValue(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const scrollToIndex = (index: number) => {
    isScrolling.value = true;
    carouselRef.current?.scrollTo({
      index,
      animated: true,
    });
    setTimeout(() => {
      isScrolling.value = false;
    }, SCROLL_DURATION_MS);
  };

  useEffect(() => {
    const index = Math.round(((value - min) / (max - min)) * (NUM_TICKS - 1));
    scrollToIndex(index);
  }, [value, min, max]);

  const handleValueChange = (index: number) => {
    if (isUserInteracting) {
      const normalizedValue = (index / (NUM_TICKS - 1)) * (max - min) + min;
      const roundedValue = Math.round(normalizedValue);
      if (roundedValue !== value) {
        onValueChange(roundedValue);
      }
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
        scrollAnimationDuration={SCROLL_DURATION_MS}
        defaultIndex={Math.round((NUM_TICKS - 1) / 2)}
        loop={false}
        onScrollBegin={() => {
          setIsUserInteracting(true);
          onScrollBegin?.();
        }}
        onScrollEnd={(index) => {
          if (!isScrolling.value) {
            handleValueChange(index);
            onScrollEnd?.();
            setIsUserInteracting(false);
          }
        }}
        onProgressChange={(_offsetProgress, absoluteProgress) =>
          !isScrolling.value &&
          isUserInteracting &&
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

interface SliderProps {
  min?: number;
  max?: number;
  value?: number;
  onValueChange: (value: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

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
