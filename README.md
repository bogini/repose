# Expression Editor

Expression Editor is a React Native app that allows users to edit facial expressions using gestures. The app is powered by a [COG version](https://github.com/fofr/cog-expression-editor) of [LivePortrait](https://liveportrait.github.io/) model, hosted on [Replicate](https://replicate.com/) and accessible via a Next.js API route. 

The app is designed to closely mimic the look and feel of the iOS 18 Photos app, providing both direct manipulation and precise controls for editing.

https://github.com/user-attachments/assets/4f258f99-3fa5-4506-a563-b2ebd1a554bb

## Project Structure

The project is organized as a monorepo using [Turborepo](https://turbo.build/). It consists of the following apps:

- `apps/expo`: The main React Native app built with Expo.
- `apps/web`: An API server built with Next.js.

## Caching strategy

The Expression Editor app uses a multi-level caching strategy to provide a low-latency responsive experience:

![Caching Strategy Diagram](diagram.png)

### In-Memory Caching (apps/expo/api/replicate.ts)

- Results are cached in an `inMemoryCache` object for fast access.
- If not found, it checks the local storage cache using `AsyncStorage`.

### Local Storage Caching (apps/expo/api/replicate.ts)

- Results are cached locally using `AsyncStorage`.
- If found, the result is stored in the `inMemoryCache` for faster subsequent access.

### Server-Side Caching (apps/web/pages/api/replicate.ts)

- Vercel Blob Storage and Vercel KV (Redis) are used for server-side caching.
- The server generates a cache key based on input parameters.
- It checks Redis and Blob Storage for cached results.
- If not found, the model is run, and the result is cached in Redis and Blob Storage for future requests.

## Getting Started

### Prerequisites

Before running the app, make sure you have the following installed:

- Node.js (v14 or later)
- Yarn package manager
- Expo CLI

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

### API server

To run the web app:

1. Navigate to the `apps/web` directory:

```bash
cd apps/web
```

2. Start the Next.js development server:

```bash
yarn dev
```

3. Update the endpoint in apps/expo/api/constants.ts to point to `http://localhost:3000`.

## Features

- Browse and select photos from a gallery
- Edit facial expressions using intuitive controls
- Adjust face position, mouth, eyes, and eyebrows
- Real-time preview of the edited photo

## Technologies Used

- React Native
- Expo
- Next.js
- Turborepo
- TypeScript
- React Native Reanimated
- React Native Gesture Handler
- Axios
- COG (Custom Operator Graph) version of LivePortrait model hosted on Replicate[^1]

[^1]: [fofr/cog-expression-editor on GitHub](https://github.com/fofr/cog-expression-editor)
