import {
  Text,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { photos } from "../../../data";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useState, useRef, useEffect } from "react";
import { CarouselSlider } from "./CarouselSlider";

interface Photo {
  id: number;
  url: string;
}

interface FaceControl {
  key: string;
  icon: string;
  label: string;
  values: {
    key: keyof FaceValues;
    label: string;
    min: number;
    max: number;
  }[];
}

type FaceValues = {
  pitch: number;
  yaw: number;
  roll: number;
  blink: number;
  wink: number;
  pupilX: number;
  pupilY: number;
  smile: number;
};

const FACE_CONTROLS: FaceControl[] = [
  {
    key: "face",
    icon: "face.smiling",
    label: "FACE",
    values: [
      {
        key: "pitch",
        label: "Pitch",
        min: -20,
        max: 20,
      },
      {
        key: "yaw",
        label: "Yaw",
        min: -20,
        max: 20,
      },
      {
        key: "roll",
        label: "Roll",
        min: -20,
        max: 20,
      },
    ],
  },
  {
    key: "eyes",
    icon: "eye.fill",
    label: "EYES",
    values: [
      {
        key: "blink",
        label: "Blink",
        min: -20,
        max: 5,
      },
      {
        key: "wink",
        label: "Wink",
        min: 0,
        max: 25,
      },
      {
        key: "pupilX",
        label: "Horizontal",
        min: -15,
        max: 15,
      },
      {
        key: "pupilY",
        label: "Vertical",
        min: -15,
        max: 15,
      },
    ],
  },
  {
    key: "mouth",
    icon: "mouth.fill",
    label: "MOUTH",
    values: [
      {
        key: "smile",
        label: "Smile",
        min: -0.3,
        max: 1.3,
      },
    ],
  },
];

export default function EditScreen() {
  const [faceValues, setFaceValues] = useState<FaceValues>({
    pitch: -20,
    yaw: -20,
    roll: -20,
    blink: -20,
    wink: 0,
    pupilX: -15,
    pupilY: -15,
    smile: -0.3,
  });
  const [loading, setLoading] = useState(false);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const photo = photos.find((p) => p.id === Number.parseInt(id));

  // useEffect(() => {
  //   if (photo) {
  //     setLoading(false);
  //   }
  // }, [photo]);

  const handleFaceValuesChange = (values: FaceValues) => {
    setLoading(true);
    setTimeout(() => {
      setFaceValues(values);
      setLoading(false);
    }, 1000);
  };

  if (!photo) {
    return <Text>Photo not found</Text>;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <TopBar onBack={() => router.back()} />
      <AdjustBar />
      <Text>Brightness</Text>
      <ImageContainer photo={photo} loading={loading} />
      {/* Add loading indicator */}
      <FaceControlsComponent
        faceValues={faceValues}
        onFaceValuesChange={handleFaceValuesChange}
      />
    </View>
  );
}

interface TopBarProps {
  onBack: () => void;
}

const TopBar = ({ onBack }: TopBarProps) => (
  <View style={styles.topBar}>
    <Pressable style={styles.topBarButton} onPress={onBack}>
      <Text style={styles.topBarButtonText}>Cancel</Text>
    </Pressable>
    <Pressable style={styles.topBarButtonRed} onPress={onBack}>
      <Text style={styles.topBarButtonTextWhite}>Revert</Text>
    </Pressable>
  </View>
);

const AdjustBar = () => (
  <View style={styles.adjustBar}>
    <View style={styles.rowWithGap}>
      <SymbolView
        name="arrow.uturn.backward.circle"
        weight="regular"
        style={styles.adjustSymbol}
        resizeMode="scaleAspectFit"
      />
      <SymbolView
        name="arrow.uturn.forward.circle"
        weight="regular"
        style={styles.adjustSymbol}
        resizeMode="scaleAspectFit"
      />
    </View>
    <Text style={styles.adjustText}>ADJUST</Text>
    <View style={styles.rowWithGap}>
      <SymbolView
        name="pencil.tip.crop.circle"
        weight="medium"
        style={styles.adjustSymbolActive}
        resizeMode="scaleAspectFit"
      />
      <SymbolView
        name="ellipsis.circle"
        weight="medium"
        style={styles.adjustSymbolActive}
        resizeMode="scaleAspectFit"
      />
    </View>
  </View>
);

interface ImageContainerProps {
  photo: Photo;
  loading: boolean;
}

const ImageContainer = ({ photo, loading }: ImageContainerProps) => {
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    pulseAnimation.value = loading
      ? withRepeat(withTiming(0.5, { duration: 750 }), -1, true)
      : withTiming(1, { duration: 250 });
  }, [loading, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseAnimation.value,
    };
  });

  return (
    <View style={styles.imageContainer}>
      <Animated.Image
        source={{ uri: photo.url }}
        style={[styles.fullSize, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

interface FaceControlsComponentProps {
  faceValues: FaceValues;
  onFaceValuesChange: (values: FaceValues) => void;
}

const FaceControlsComponent = ({
  faceValues,
  onFaceValuesChange,
}: FaceControlsComponentProps) => {
  const [selectedControl, setSelectedControl] = useState(FACE_CONTROLS[0]);
  const carouselRef = useRef<ICarouselInstance>(null);

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({
      index,
      animated: true,
    });
  };

  const handleValueChange = (key: keyof FaceValues, value: number) => {
    onFaceValuesChange({
      ...faceValues,
      [key]: value,
    });
  };

  return (
    <View style={styles.bottomPager}>
      <Text style={styles.selectedLabel}>{selectedControl.label}</Text>
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={100}
        height={30}
        data={FACE_CONTROLS}
        defaultIndex={0}
        loop={false}
        onSnapToItem={(index) => setSelectedControl(FACE_CONTROLS[index])}
        renderItem={({ item, animationValue, index }) => (
          <CarouselItemComponent
            animationValue={animationValue}
            icon={item.icon}
            onPress={() => scrollToIndex(index)}
          />
        )}
      />
      <View style={styles.slidersContainer}>
        {selectedControl.values.map((value) => (
          <View key={value.label} style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{value.label}</Text>
            <CarouselSlider
              key={value.label}
              min={value.min}
              max={value.max}
              value={faceValues[value.key]}
              onValueChange={(val) => handleValueChange(value.key, val)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

interface CarouselItemProps {
  animationValue: Animated.SharedValue<number>;
  icon: string;
  onPress: () => void;
}

const CarouselItemComponent = ({
  animationValue,
  icon,
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
    <Pressable onPress={onPress} style={{ height: 32 }}>
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          containerStyle,
        ]}
      >
        <SymbolView
          name={icon as any}
          weight="regular"
          style={styles.facePartIcon}
          resizeMode="scaleAspectFit"
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  slidersContainer: {
    flex: 1,
    gap: 10,
    flexDirection: "column",
    alignItems: "center",
  },
  sliderContainer: {
    flex: 1,
    gap: 4,
    flexDirection: "column",
    alignItems: "center",
  },
  sliderLabel: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 12,
  },
  sliderValue: {
    color: "#8E8D93",
  },
  adjustBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  adjustSymbol: {
    height: 24,
    width: 24,
    tintColor: "#46454A",
  },
  adjustSymbolActive: {
    height: 24,
    width: 24,
    tintColor: "#8E8D93",
  },
  facePartIcon: {
    height: 32,
    width: 32,
    tintColor: "#8E8D93",
  },
  adjustText: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  imageContainer: {
    flex: 1,
  },
  topBarButton: {
    backgroundColor: "#8E8D93",
    borderRadius: 50,
    padding: 7,
    paddingHorizontal: 12,
  },
  topBarButtonRed: {
    backgroundColor: "red",
    borderRadius: 50,
    padding: 7,
    paddingHorizontal: 12,
  },
  topBarButtonTextWhite: {
    fontWeight: "700",
    color: "#FFF",
  },
  rowWithGap: {
    flexDirection: "row",
    gap: 15,
  },
  topBarButtonText: {
    fontWeight: "700",
  },
  symbol: {
    height: 28,
    width: 28,
  },
  photoInfo: {
    flexDirection: "column",
    gap: 3,
  },
  topSymbol: {
    height: 15,
    width: 15,
  },
  topButton: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 50,
    padding: 6,
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 7,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    width: "100%",
    zIndex: 1,
    paddingHorizontal: 40,
  },
  titleText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 20,
  },
  subheadingText: {
    color: "rgba(0, 0, 0, 0.5)",
    fontWeight: "light",
    fontSize: 12,
  },
  carousel: {
    width: "100%",
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  iconButton: {
    marginHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 25,
    padding: 10,
  },
  selectedLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "thin",
    textAlign: "center",
    margin: 10,
  },
  bottomPager: {
    flex: 1,
    marginTop: 20,
    marginBottom: 50,
  },
});
