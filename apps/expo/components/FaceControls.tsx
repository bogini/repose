import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useEffect, useRef, useState } from "react";
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
  const [showSliders, setShowSliders] = useState(true);
  const slidersAnimation = useSharedValue(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [debouncedFaceValues, setDebouncedFaceValues] = useState(faceValues);

  const selectedControl = controls.find(
    (control) => control.key === selectedControlKey
  );

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({ index, animated: true });
    setSelectedControl(controls[index]);
  };

  const handleValueChange = (key: keyof FaceValues, value: number) => {
    console.log({ isUserInteracting, key, value });
    if (isUserInteracting && faceValues[key] !== value) {
      onFaceValuesChange({ ...faceValues, [key]: value });
    }
  };

  useEffect(() => {
    const debouncedSetFaceValues = debounce((values) => {
      setDebouncedFaceValues(values);
    }, 200);

    debouncedSetFaceValues(faceValues);

    return () => {
      debouncedSetFaceValues.cancel();
    };
  }, [faceValues]);

  useEffect(() => {
    slidersAnimation.value = withTiming(showSliders ? 1 : 0, { duration: 250 });
  }, [showSliders, slidersAnimation]);

  const slidersContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          slidersAnimation.value,
          [0, 1],
          [10, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: slidersAnimation.value,
  }));

  return (
    <View style={styles.faceControls}>
      {selectedControl && (
        <>
          <Animated.View
            style={[styles.slidersContainer, slidersContainerStyle]}
          >
            {selectedControl.values.map((value) => (
              <View key={value.label} style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>{value.label}</Text>
                <CarouselSlider
                  key={value.label}
                  min={value.min}
                  max={value.max}
                  value={debouncedFaceValues[value.key]}
                  onValueChange={(val) => handleValueChange(value.key, val)}
                  onScrollBegin={() => setIsUserInteracting(true)}
                  onScrollEnd={() => setIsUserInteracting(false)}
                />
              </View>
            ))}
          </Animated.View>
          <Text style={styles.selectedLabel}>{selectedControl.label}</Text>
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
            if (isUserInteracting) {
              const roundedIndex = Math.round(index);
              const nextControl = controls[roundedIndex];
              if (selectedControl && nextControl.key !== selectedControl.key) {
                setSelectedControl(nextControl);
              }
            }
          }}
          renderItem={({ item, animationValue, index }) => (
            <FaceControlIcon
              animationValue={animationValue}
              icon={item.icon}
              onPress={() => scrollToIndex(index)}
              isSelected={selectedControlKey === item.key && showSliders}
            />
          )}
        />
      </View>
    </View>
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
    gap: 12,
    flexDirection: "column",
    marginHorizontal: 20,
    minHeight: 150,
  },
  sliderContainer: {
    height: 40,
    flex: 0,
    gap: 5,
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
    margin: 10,
  },
  faceControls: {
    gap: 10,
    justifyContent: "flex-start",
    marginVertical: 20,
  },
});
