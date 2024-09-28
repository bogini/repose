import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';

type Carousel = {
  title: string;
  photos: any[];
};

export default function Carousel({ title, photos }: Carousel) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        contentContainerStyle={styles.images}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={250 + 15}
        decelerationRate="fast"
      >
        {photos.map((photo) => (
          <Image key={photo.id} source={photo.image} style={styles.image} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    padding: 15,
    fontWeight: '700',
    fontSize: 20,
  },
  images: {
    gap: 15,
    paddingHorizontal: 20,
  },
  image: {
    width: 250,
    height: 150,
    borderRadius: 15,
  },
});
