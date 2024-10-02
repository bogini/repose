import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useEffect, useRef, useState, useCallback } from "react";
import debounce from "lodash/debounce";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CarouselSlider } from "./CarouselSlider";
import { SymbolView } from "expo-symbols";
import { FaceControl, FaceValues } from "../lib/faceControl";

const ANIMATION_DURATION_MS = 100;

interface FaceControlsComponentProps {
  controls: FaceControl[];
  faceValues: FaceValues;
  onFaceValuesChange: (values: FaceValues) => void;
  selectedControlKey: FaceControl["key"];
  onControlChange: (control: FaceControl) => void;
}

export const FaceControlsComponent = ({
  controls,
  faceValues,
  onFaceValuesChange,
  selectedControlKey,
  onControlChange: setSelectedControl,
}: FaceControlsComponentProps) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const [showSliders, setShowSliders] = useState(false);
  const [showSlidersView, setShowSlidersView] = useState(false);
  const faceControlsHeight = useSharedValue(0);
  const slidersAnimation = useSharedValue(0);

  const selectedControl = controls.find(
    (control) => control.key === selectedControlKey
  );

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({ index, animated: true });
    setSelectedControl(controls[index]);
  };

  const handleValueChange = useCallback(
    (key: keyof FaceValues, value: number) => {
      if (faceValues[key] !== value) {
        onFaceValuesChange({ ...faceValues, [key]: value });
      }
    },
    [faceValues, onFaceValuesChange]
  );

  useEffect(() => {
    slidersAnimation.value = withTiming(showSliders ? 1 : 0);
  }, [showSliders, slidersAnimation]);

  const faceControlsStyle = useAnimatedStyle(() => ({
    height: withTiming(faceControlsHeight.value, {
      duration: ANIMATION_DURATION_MS,
    }),
  }));

  useEffect(() => {
    faceControlsHeight.value = withTiming(showSliders ? 250 : 150, {
      duration: ANIMATION_DURATION_MS,
    });
    slidersAnimation.value = withTiming(showSliders ? 1 : 0, {
      duration: ANIMATION_DURATION_MS,
    });
    setShowSlidersView(showSliders);
  }, [showSliders]);

  const slidersContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(
          interpolate(
            slidersAnimation.value,
            [0, 1],
            [20, 0],
            Extrapolation.CLAMP
          ),
          { duration: ANIMATION_DURATION_MS }
        ),
      },
    ],
    opacity: withTiming(
      interpolate(slidersAnimation.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      { duration: ANIMATION_DURATION_MS }
    ),
  }));

  const instructionsContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          slidersAnimation.value,
          [0, 1],
          [0, -10],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      slidersAnimation.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View style={[styles.faceControls, faceControlsStyle]}>
      {selectedControl && (
        <>
          {showSlidersView && (
            <Animated.View
              style={[styles.slidersContainer, slidersContainerStyle]}
            >
              {selectedControl.values.map((value) => (
                <View key={value.label} style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>{value.label}</Text>
                  <CarouselSlider
                    min={value.min}
                    max={value.max}
                    value={faceValues[value.key]}
                    onValueChange={(val) => handleValueChange(value.key, val)}
                  />
                </View>
              ))}
            </Animated.View>
          )}

          {!showSlidersView && (
            <Animated.View
              style={[styles.instructionsContainer, instructionsContainerStyle]}
            >
              <Text style={styles.instructionsText}>
                {selectedControl.instructions}
              </Text>
            </Animated.View>
          )}
        </>
      )}
      <View style={styles.carouselContainer}>
        <Carousel
          style={styles.carousel}
          ref={carouselRef}
          width={100}
          height={58}
          data={controls}
          defaultIndex={0}
          loop={false}
          onProgressChange={(_ofset, index) => {
            const roundedIndex = Math.round(index);
            const nextControl = controls[roundedIndex];
            if (selectedControl && nextControl.key !== selectedControl.key) {
              setSelectedControl(nextControl);
            }
          }}
          renderItem={({ item, animationValue, index }) => (
            <FaceControlIcon
              animationValue={animationValue}
              icon={item.icon}
              onPress={() => {
                scrollToIndex(index);
                if (selectedControlKey === item.key) {
                  setShowSliders(!showSliders);
                }
              }}
              isSelected={selectedControlKey === item.key}
            />
          )}
        />
      </View>
    </Animated.View>
  );
};

const FaceControlIcon = ({
  animationValue,
  icon,
  onPress,
  isSelected,
}: {
  animationValue: Animated.SharedValue<number>;
  icon: string;
  onPress: () => void;
  isSelected: boolean;
}) => {
  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { opacity };
  }, [animationValue]);

  const borderColorStyle = useAnimatedStyle(() => {
    const borderColor = isSelected
      ? withTiming("#FFD409", { duration: 250 })
      : withTiming("#46454A", { duration: 250 });
    return { borderColor };
  }, [isSelected]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          containerStyle,
        ]}
      >
        <Animated.View
          style={[styles.faceceControlIconContainer, borderColorStyle]}
        >
          <SymbolView
            name={icon as any}
            weight="regular"
            style={styles.faceceControlIcon}
            resizeMode="scaleAspectFit"
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  slidersContainer: {
    gap: 10,
    flexDirection: "column",
    marginVertical: 12,
  },
  instructionsContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 25,
  },
  instructionsText: {
    color: "#8E8D93",
    fontSize: 14,
  },
  sliderContainer: {
    height: 40,
    flex: 0,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  faceceControlIconContainer: {
    borderRadius: 50,
    padding: 10,
    borderWidth: 2,
  },
  carouselContainer: {
    width: "100%",
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },
  carousel: {
    width: "200%",
    justifyContent: "center",
    alignItems: "center",
  },
  faceceControlIcon: {
    height: 32,
    width: 32,
    tintColor: "#8E8D93",
  },
  sliderLabel: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 12,
  },
  selectedLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "thin",
    textAlign: "center",
  },
  faceControls: {
    gap: 5,
    justifyContent: "flex-end",
    marginBottom: 40,
  },
});
