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
  runOnJS,
  useAnimatedStyle,
} from "react-native-reanimated";
import { debounce } from "lodash";
import * as Haptics from "expo-haptics";
import { opacity } from "react-native-reanimated/lib/typescript/reanimated2/Colors";

const DEBOUNCE_TIME_MS = 50;
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
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);

  const valueToIndex = useCallback(
    (val: number) => {
      "worklet";
      const normalizedValue = (val - min) / (max - min);
      const index = Math.round(normalizedValue * (NUM_TICKS - 1));
      return Math.max(0, Math.min(index, NUM_TICKS - 1));
    },
    [min, max]
  );

  const indexToValue = useCallback(
    (index: number) => {
      "worklet";
      const normalizedPosition = index / (NUM_TICKS - 1);
      return Math.round((min + normalizedPosition * (max - min)) * 100) / 100;
    },
    [min, max]
  );

  const carouselRef = useRef<ICarouselInstance>(null);

  const scrollToIndex = useCallback(
    (index: number, isProgrammatic: boolean) => {
      if (carouselRef.current?.getCurrentIndex() !== index) {
        setIsProgrammaticScroll(isProgrammatic);
        carouselRef.current?.scrollTo({
          index,
          animated: true,
          onFinished: () => {
            setTimeout(() => {
              setIsProgrammaticScroll(false);
            }, 1000);
          },
        });
      }
    },
    []
  );

  const debouncedScrollToIndex = useMemo(
    () =>
      debounce(scrollToIndex, 20, {
        leading: false,
        trailing: true,
      }),
    [scrollToIndex]
  );

  const handleValueChange = useCallback(
    (index: number) => {
      const newValue = indexToValue(index);
      const roundedValue = Math.round(newValue);
      if (roundedValue !== value && !isProgrammaticScroll) {
        onValueChange(roundedValue);
      }
    },
    [indexToValue, onValueChange, value, isProgrammaticScroll]
  );

  const debouncedHandleValueChange = useMemo(
    () =>
      debounce(handleValueChange, DEBOUNCE_TIME_MS, {
        leading: false,
        trailing: true,
        maxWait: 1000,
      }),
    [handleValueChange]
  );

  const debouncedHaptics = useMemo(
    () =>
      debounce(
        () => {
          Haptics.selectionAsync();
        },
        30,
        {
          leading: false,
          trailing: true,
          maxWait: 150,
        }
      ),
    []
  );

  const initialIndex = useMemo(() => valueToIndex(value), [valueToIndex]);

  useEffect(() => {
    const index = Math.round(((value - min) / (max - min)) * (NUM_TICKS - 1));
    debouncedScrollToIndex(index, true);

    return () => {
      debouncedScrollToIndex.cancel();
      debouncedHandleValueChange.cancel();
      debouncedHaptics.cancel();
    };
  }, [
    value,
    min,
    max,
    debouncedScrollToIndex,
    debouncedHandleValueChange,
    debouncedHaptics,
  ]);

  return (
    <View
      style={[styles.container, { opacity: isProgrammaticScroll ? 0.9 : 1 }]}
    >
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={10}
        height={14}
        defaultIndex={initialIndex}
        data={data}
        scrollAnimationDuration={SCROLL_DURATION_MS}
        loop={false}
        onScrollBegin={() => {
          onScrollStart?.();
        }}
        onSnapToItem={(index) => {
          if (!isProgrammaticScroll) {
            debouncedHandleValueChange(index);
          }
          debouncedHaptics.cancel();
          onScrollEnd?.();
        }}
        onProgressChange={(_, absoluteProgress) => {
          if (
            Math.abs(absoluteProgress - Math.round(absoluteProgress)) >= 0.02 &&
            !isProgrammaticScroll
          ) {
            runOnJS(debouncedHaptics)();
          }

          const currentIndex = carouselRef.current?.getCurrentIndex();
          const newIndex = Math.round(absoluteProgress);
          if (currentIndex !== newIndex && !isProgrammaticScroll) {
            debouncedHandleValueChange(newIndex);
          }
        }}
        renderItem={({ index, animationValue }) => (
          <SliderTick
            animationValue={animationValue}
            onPress={() => scrollToIndex(index, false)}
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
