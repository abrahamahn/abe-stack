# Abe Stack Mobile App

React Native mobile application for abe-stack.

## Features

- Built with React Native
- TypeScript support
- Cross-platform (iOS and Android)
- Shared code with other abe-stack apps
- Hot reload in development

## Prerequisites

- Node.js 18+
- pnpm
- React Native development environment:
  - For iOS: Xcode (macOS only)
  - For Android: Android Studio and Android SDK

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start Metro bundler
pnpm start

# Run on iOS (macOS only)
pnpm ios

# Run on Android
pnpm android
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/       # Screen components
│   ├── components/    # Reusable components
│   ├── navigation/    # Navigation configuration
│   └── App.tsx        # Main app component
├── android/           # Android native code
├── ios/              # iOS native code
└── __tests__/        # Test files
```

## Setup Native Projects

### iOS

1. Navigate to `ios/` directory
2. Run `pod install`
3. Open `.xcworkspace` file in Xcode

### Android

1. Open `android/` directory in Android Studio
2. Sync Gradle files
3. Configure signing if needed

## Building

### iOS

```bash
# Build for simulator
pnpm ios

# Build for device (requires provisioning profile)
pnpm ios --device
```

### Android

```bash
# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK (requires signing config)
cd android && ./gradlew assembleRelease
```

## Next Steps

1. Set up navigation structure
2. Create screens and components
3. Integrate with backend API
4. Add state management (Redux, Context, etc.)
5. Implement authentication
6. Add push notifications
7. Configure app icons and splash screens
8. Set up CI/CD for mobile builds
