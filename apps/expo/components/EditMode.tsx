import { StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

interface EditModeComponentProps {}

export const EditModesComponent = ({}: EditModeComponentProps) => {
  return (
    <View style={[styles.editModeContainer]}>
      <View style={[styles.editModeIconsContainer]}>
        <View style={[styles.editModeIconContainer]}>
          <SymbolView
            style={[styles.icon]}
            name="dial.low"
            weight="regular"
            resizeMode="scaleAspectFit"
          />
          <Text style={[styles.editModeIconText]}>Adjust</Text>
        </View>
        <View style={[styles.editModeIconContainer]}>
          <SymbolView
            style={[styles.icon]}
            name="camera.filters"
            weight="regular"
            resizeMode="scaleAspectFit"
          />
          <Text style={[styles.editModeIconText]}>Adjust</Text>
        </View>
        <View style={[styles.editModeIconContainer]}>
          <SymbolView
            style={[styles.icon]}
            name="crop.rotate"
            weight="regular"
            resizeMode="scaleAspectFit"
          />
          <Text style={[styles.editModeIconText]}>Crop</Text>
        </View>
        <View style={[styles.editModeIconContainer]}>
          <SymbolView
            style={[styles.triangleIcon]}
            name="triangle.fill"
            weight="regular"
            resizeMode="scaleAspectFit"
            tintColor="#FFD409"
          />
          <SymbolView
            style={[styles.icon]}
            name="face.smiling.inverse"
            weight="regular"
            resizeMode="scaleAspectFit"
            tintColor="white"
          />
          <Text
            style={[styles.editModeIconText, styles.editModeIconTextSelected]}
          >
            Face
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  editModeContainer: {
    marginBottom: 30,
    height: 54,
  },
  icon: {
    height: 28,
    width: 28,
    tintColor: "#8E8D93",
  },
  editModeIconsContainer: {
    flexDirection: "row",
    flex: 1,
    gap: 30,
    alignItems: "flex-end",
    justifyContent: "center",
    height: 30,
  },
  editModeIconContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    justifyContent: "center",
  },
  editModeIconText: {
    color: "#8E8D93",
    fontSize: 10,
  },
  editModeIconTextSelected: {
    color: "#fff",
  },
  triangleIcon: {
    height: 8,
    width: 8,
    transform: [{ rotate: "180deg" }],
  },
});
