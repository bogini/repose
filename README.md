# Expression Editor

Expression Editor is a React Native app that allows users to edit facial expressions using gestures. The app leverages a [COG version](https://github.com/fofr/cog-expression-editor) of the [LivePortrait](https://liveportrait.github.io/) model, hosted on [Replicate](https://replicate.com/) and accessible via a Next.js API route.

The app is designed to closely mimic the look and feel of the iOS 18 Photos app, providing both direct manipulation and precise controls for editing.

![App Screenshot](https://github.com/user-attachments/assets/4f258f99-3fa5-4506-a563-b2ebd1a554bb)

## Project Structure

The project is organized as a monorepo using [Turborepo](https://turbo.build/). It consists of the following apps:

- **`apps/expo`**: The main React Native app built with Expo.
  - Handles user interface and interactions
  - Implements gesture controls for facial expression editing
  - Manages local caching of results
  - Uses Reanimated for smooth animations
  - Implements a Photos app-like UI with carousels and grid views

- **`apps/web`**: An API server built with Next.js.
  - Provides API endpoints for the Replicate model
  - Handles server-side caching using Vercel KV and Blob Storage
  - Manages photo uploads and storage

## Key Features

### Gesture Controls

- Direct manipulation of facial features using intuitive gestures
- Real-time preview of expression changes
- Haptic feedback for enhanced user experience
- Support for:
  - Face rotation (pitch, yaw, roll)
  - Eye position and blinking
  - Smile intensity
  - Eyebrow position

### Shader Loading Animation

The Expression Editor app proactively caches expression variations to provide an instant response when users adjust facial features. However it is possible to navigate to an uncached face rotation, in which case the app uses an on-device selfie segmentation model to create a visually appealing loading animation. This animation separates the foreground (face/person) from the background and applies dynamic shaders to indicate that the foreground is being processed, helping users understand the computation state while maintaining a polished experience.

| Segmentation | Shader animation | Final result |
|--------------|--------------|--------------|
| <img width="386" alt="selfie_segmentation" src="https://github.com/user-attachments/assets/b263217d-12ee-400b-9bbb-dcb1f1cb7345" /> | ![Shader animation](https://github.com/user-attachments/assets/09c4151b-25df-49e4-a0b0-27552310b30f) | ![Final result](https://github.com/user-attachments/assets/82073f35-df9c-4b94-b3b9-239e327808c0) |

### How It Works

1. **On-device segmentation models**: The app uses [Mediapipe's selfie segmentation model](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/selfie_segmentation.md) to identify and separate different parts of an image, such as the face, hair, and background. This segmentation data is then used to apply shaders selectively to different segments.

2. **Shaders**: A custom shader is applied to the segmented parts of the image. These shaders are written using [Skia's runtime effects](https://shopify.github.io/react-native-skia/docs/shaders/overview/) and are designed to create smooth, animated transitions. See [apps/expo/components/WaveShader.ts](apps/expo/components/WaveShader.ts) for implementation details.

3. **Animation**: The shaders are animated using [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/), which allows for smooth and performant animations. The animation parameters, such as time and position, are dynamically updated to create a continuous and engaging effect.

### Multi-level Caching Strategy

The Expression Editor app uses a sophisticated multi-level caching strategy combined with proactive processing to provide a low-latency responsive experience. When a user uploads a new photo, the app immediately begins processing a predefined set of common expression variations in the background. Rather than allowing infinite combinations of parameters, the app quantizes input values (e.g. rotation angles are limited to 15° increments) to maximize cache hits while still providing natural-feeling controls. This strategic limitation means most user interactions will hit a pre-warmed cache:

![Caching Strategy Diagram](diagram.png)

- **In-Memory Caching**: Results are cached in an `inMemoryCache` object for fast access. If not found, it checks the local storage cache using `AsyncStorage`.
- **Local Storage Caching**: Results are cached locally using `AsyncStorage`. If found, the result is stored in the `inMemoryCache` for faster subsequent access. Provides offline access to previously generated expressions.
- **Server-Side Caching**: Vercel Blob Storage and Vercel KV (Redis) are used for server-side caching. The server generates a cache key based on input parameters. It checks Redis and Blob Storage for cached results. If not found, the model is run, and the result is cached in Redis and Blob Storage for future requests.

### Photo Management

- Browse and select photos from a gallery
- Upload new photos
- Organize photos in albums
- Carousel view for featured photos
- Grid view for photo library

## Getting Started

### Prerequisites

Before running the app, ensure you have the following installed:

- Node.js (v14 or later)
- Yarn package manager
- Expo CLI
- Replicate API token (for model access)
- Vercel account (for deployment)

### Environment Setup

1. Create a `.env` file in `apps/web`:
   ```plaintext
   BLOB_READ_WRITE_TOKEN=
   KV_REST_API_TOKEN=
   KV_REST_API_URL=
   REPLICATE_API_TOKEN=
   ```

2. Update the file in `apps/expo/api/constants.ts`:
   ```typescript
   export const BASE_URL = "https://your-app-name.vercel.app"; // or localhost if you are running locally
   ```

3. Deploy the [COG version](https://github.com/fofr/cog-expression-editor) of the [LivePortrait](https://liveportrait.github.io/) model on Replicate. Or you can use `https://replicate.com/fofr/expression-editor`, but it will be slower as it runs on L40S.

4. Update the model identifier in `apps/web/pages/api/replicate.ts`:
   ```typescript
   const MODEL_IDENTIFIER = "YOUR-REPLICATE-MODEL-IDENTIFIER";
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/expression-editor.git
   cd expression-editor
   ```

2. Install the dependencies:
   ```bash
   yarn install
   ```

## Running the App

### Expo App

To run the Expo app:

1. Navigate to the `apps/expo` directory:
   ```bash
   cd apps/expo
   ```

2. Start the Expo development server:
   ```bash
   yarn start
   ```

3. Follow the instructions in the terminal to run the app on an iOS or Android simulator, or scan the QR code with the Expo Go app on your mobile device.

### API Server

To run the web app:

1. Navigate to the `apps/web` directory:
   ```bash
   cd apps/web
   ```

2. Start the Next.js development server:
   ```bash
   yarn dev
   ```

3. Update the endpoint in `apps/expo/api/constants.ts` to point to `http://localhost:3000`.

## Technologies Used

### Mobile Development
- React Native - Core mobile framework
- Expo - Mobile development platform
- React Native Reanimated - Animation library
- React Native Gesture Handler - Touch handling
- React Native Skia - Graphics and drawing
  - [React Native Skia shaders](https://shopify.github.io/react-native-skia/docs/shaders/overview/)
- Expo Router - Navigation

### Web Development
- Next.js - React framework
- TypeScript - Type-safe JavaScript
- Axios - HTTP client

### Infrastructure
- Turborepo - Monorepo build system
- Vercel KV (Redis) - Key-value storage
- Vercel Blob Storage - File storage
- Replicate API - ML model hosting
  - COG (Custom Operator Graph) version of LivePortrait model[^1]

[^1]: [fofr/cog-expression-editor on GitHub](https://github.com/fofr/cog-expression-editor)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

