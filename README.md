# Expression Editor

Expression Editor is a React Native app that allows users to edit facial expressions in photos using AI-powered controls. The app uses the [LivePortrait](https://liveportrait.github.io/) model, which is hosted on [Replicate](https://replicate.com/). Replicate has a deployment of the [cog-expression-editor](https://github.com/fofr/cog-expression-editor) repository that enables easy integration of the model into applications.

The app is designed to closely mimic the look and feel of the iOS 18 Photos app.

![Demo Video](video.mp4)

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
