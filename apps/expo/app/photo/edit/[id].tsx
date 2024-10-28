import { Text, View, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useState, useRef, useEffect, useCallback } from "react";
import PhotosService from "../../../api/photos";
import ReplicateService from "../../../api/replicate";
import { FaceControlsComponent } from "../../../components/FaceControls";
import { FaceGestureControl } from "../../../components/FaceGestureControl";
import {
  DEFAULT_FACE_VALUES,
  FACE_CONTROLS,
  FaceControl,
  FaceValues,
} from "../../../lib/faceControl";
import { EditModesComponent } from "../../../components/EditMode";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { debounce } from "lodash";

const LOADING_DELAY_MS = 120;

export default function EditScreen() {
  const router = useRouter();
  const [debug, setDebug] = useState<boolean>(false);
  const [faceValues, setFaceValues] = useState<FaceValues>(DEFAULT_FACE_VALUES);
  const [loading, setLoading] = useState(false);
  const [selectedControl, setSelectedControl] = useState(FACE_CONTROLS[0]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [originalImageUrl, setOriginalImageUrl] = useState<
    string | undefined
  >();
  const [editedImageUrl, setEditedImageUrl] = useState<string | undefined>();
  const lastStateUpdateTimestampRef = useRef(0);

  const debouncedCache = useCallback(
    debounce(
      (imageUrl: string, values: FaceValues, control: FaceControl) => {
        void ReplicateService.cacheExpressionEditorResultsWithFaceControls(
          imageUrl,
          values,
          control
        );
      },
      1000,
      { trailing: true }
    ),
    []
  );

  const handleControlChange = useCallback(
    (control: FaceControl) => {
      if (control.key !== selectedControl.key) {
        setSelectedControl(control);

        if (originalImageUrl) {
          debouncedCache(originalImageUrl, faceValues, control);
        }
      }
    },
    [originalImageUrl, faceValues, selectedControl.key, debouncedCache]
  );

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const fetchedPhoto = await PhotosService.getPhotoById(id);
        if (!fetchedPhoto) {
          throw new Error("Photo not found");
        }
        setOriginalImageUrl(fetchedPhoto.url);
        setEditedImageUrl(fetchedPhoto.url);
        debouncedCache(fetchedPhoto.url, faceValues, selectedControl);
      } catch (error) {
        console.error("Error fetching photo:", error);
      }
    };

    fetchPhoto();
  }, [id]);

  const handleFaceValuesChange = useCallback(
    async (values: FaceValues) => {
      setFaceValues(values);

      if (!originalImageUrl) return;

      const requestTimestamp = Date.now();
      const isOutdated = () =>
        requestTimestamp < lastStateUpdateTimestampRef.current;

      // Set up delayed loading state
      const loadingTimeout = setTimeout(() => {
        if (!isOutdated()) {
          setLoading(true);
        }
      }, LOADING_DELAY_MS);

      try {
        if (isOutdated()) return;

        const updatedImageUrl = await ReplicateService.runExpressionEditor(
          {
            image: originalImageUrl,
            ...values,
          },
          true
        );

        if (!isOutdated() && updatedImageUrl) {
          setEditedImageUrl(updatedImageUrl);
          lastStateUpdateTimestampRef.current = requestTimestamp;
        }
      } finally {
        clearTimeout(loadingTimeout);
        if (!isOutdated()) {
          setLoading(false);
        }
      }
    },
    [originalImageUrl]
  );

  useEffect(() => {
    // Initial run
    const timeoutId = setTimeout(() => {
      if (originalImageUrl) {
        handleFaceValuesChange(faceValues);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [originalImageUrl]);

  if (!originalImageUrl) {
    return (
      <View
        style={{ backgroundColor: "black", width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      <TopBar onBack={() => router.back()} />
      <AdjustBar onDebugToggle={() => setDebug(!debug)} />

      <View style={styles.imageContainer}>
        <FaceGestureControl
          originalImageUrl={originalImageUrl}
          debug={debug}
          imageUrl={editedImageUrl}
          faceValues={faceValues}
          onFaceValuesChange={handleFaceValuesChange}
          selectedControl={selectedControl}
          loading={loading}
        />
      </View>

      <FaceControlsComponent
        controls={FACE_CONTROLS}
        faceValues={faceValues}
        loading={loading}
        onFaceValuesChange={handleFaceValuesChange}
        selectedControlKey={selectedControl.key}
        onControlChange={handleControlChange}
      />

      <EditModesComponent />
    </View>
  );
}

const TopBar = ({ onBack }: { onBack: () => void }) => (
  <View style={styles.topBar}>
    <Pressable style={styles.topBarButton} onPress={onBack}>
      <Text style={styles.topBarButtonText}>Cancel</Text>
    </Pressable>
    <Pressable style={styles.topBarButtonRed} onPress={onBack}>
      <Text style={styles.topBarButtonTextWhite}>Revert</Text>
    </Pressable>
  </View>
);

const AdjustBar = ({ onDebugToggle }: { onDebugToggle: () => void }) => {
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onStart(() => {
      runOnJS(onDebugToggle)();
    });

  return (
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
        <GestureDetector gesture={doubleTap}>
          <SymbolView
            name="ellipsis.circle"
            weight="medium"
            style={styles.adjustSymbolActive}
            resizeMode="scaleAspectFit"
          />
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  adjustBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
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
  adjustText: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 14,
  },
  container: {
    backgroundColor: "#000",
    flex: 1,
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    width: "100%",
    zIndex: 1,
    paddingHorizontal: 40,
  },
});
