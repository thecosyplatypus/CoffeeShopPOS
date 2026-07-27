import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coffeeshop.pos',
  appName: 'Coffee Shop',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 2000, backgroundColor: '#1a0e06' },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
  ios: { contentInset: 'always' },
  android: { allowMixedContent: true },
};

export default config;
