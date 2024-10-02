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
  FaceValues,
} from "../../../lib/faceControl";
import { EditModesComponent } from "../../../components/EditMode";

export default function EditScreen() {
  const router = useRouter();
  const [faceValues, setFaceValues] = useState<FaceValues>(DEFAULT_FACE_VALUES);
  const [loading, setLoading] = useState(false);
  const [selectedControl, setSelectedControl] = useState(FACE_CONTROLS[0]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [originalImageUrl, setOriginalImageUrl] = useState<
    string | undefined
  >();
  const [editedImageUrl, setEditedImageUrl] = useState<string | undefined>();
  const lastStateUpdateTimestampRef = useRef(0);

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const fetchedPhoto = await PhotosService.getPhotoById(id);
        if (!fetchedPhoto) {
          throw new Error("Photo not found");
        }
        setOriginalImageUrl(fetchedPhoto.url);
        setEditedImageUrl(fetchedPhoto.url);
      } catch (error) {
        console.error("Error fetching photo:", error);
      }
    };

    fetchPhoto();
  }, [id]);

  const handleFaceValuesChange = useCallback(
    async (values: FaceValues) => {
      setFaceValues(values);

      if (originalImageUrl) {
        const requestTimestamp = Date.now();

        // Only show loading after 50ms if waiting
        const loadingTimeout = setTimeout(() => setLoading(true), 50);

        try {
          const updatedImageUrl = await ReplicateService.runExpressionEditor(
            {
              image: originalImageUrl,
              rotatePitch: values.rotatePitch,
              rotateYaw: values.rotateYaw,
              rotateRoll: values.rotateRoll,
              pupilX: values.pupilX,
              eyebrow: values.eyebrow,
              pupilY: values.pupilY,
              smile: values.smile,
              blink: values.blink,
              wink: values.wink,
            },
            true
          );

          // Only update the state if the request timestamp is greater than the last state update timestamp
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            if (requestTimestamp > lastStateUpdateTimestampRef.current) {
              setEditedImageUrl(updatedImageUrl);
              lastStateUpdateTimestampRef.current = requestTimestamp;
            }
          } else {
            if (requestTimestamp > lastStateUpdateTimestampRef.current) {
              setEditedImageUrl(updatedImageUrl);
              lastStateUpdateTimestampRef.current = requestTimestamp;
            }
          }
        } finally {
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            setLoading(false);
          }
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
      <AdjustBar />

      <View style={styles.imageContainer}>
        <FaceGestureControl
          debug={true}
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
        onFaceValuesChange={handleFaceValuesChange}
        selectedControlKey={selectedControl.key}
        onControlChange={setSelectedControl}
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

const AdjustBar = ({}: {}) => (
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
