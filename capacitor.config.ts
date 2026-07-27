import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coffeeshop.pos',
  appName: 'Coffee Shop',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, backgroundColor: '#f9fafb', androidScaleType: 'CENTER_CROP', showSpinner: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
  ios: { contentInset: 'always' },
  android: { allowMixedContent: true },
};

export default config;
