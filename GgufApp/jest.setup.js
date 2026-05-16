jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {
    allFiles: 'allFiles',
  },
  isCancel: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  copyFile: jest.fn(),
  downloadFile: jest.fn(() => ({promise: Promise.resolve({statusCode: 200})})),
}));

jest.mock('llama.rn', () => ({
  initLlama: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({isConnected: true})),
  addEventListener: jest.fn(),
}));

import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-gesture-handler', () => {
  const RNGestureHandlerModule = require('react-native-gesture-handler/jestSetup');
  return {
    ...RNGestureHandlerModule,
    GestureHandlerRootView: jest
      .fn()
      .mockImplementation(({children}) => children),
    PanGestureHandler: jest.fn(),
    State: {},
    TapGestureHandler: jest.fn(),
    FlingGestureHandler: jest.fn(),
    ForceTouchGestureHandler: jest.fn(),
    LongPressGestureHandler: jest.fn(),
    PinchGestureHandler: jest.fn(),
    RotationGestureHandler: jest.fn(),
    RawButton: jest.fn(),
    BaseButton: jest.fn(),
    RectButton: jest.fn(),
    BorderlessButton: jest.fn(),
    createNativeWrapper: jest.fn(),
    ScrollView: jest.fn(),
    Switch: jest.fn(),
    TextInput: jest.fn(),
    ToolbarAndroid: jest.fn(),
    ViewPagerAndroid: jest.fn(),
    DrawerLayoutAndroid: jest.fn(),
    WebView: jest.fn(),
    NativeViewGestureHandler: jest.fn(),
    Direction: {},
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  const React = require('react');
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({children}) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({children}) => children(inset)),
    SafeAreaInsetsContext: {
      Consumer: ({children}) => children(inset),
    },
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

jest.mock('react-native-device-info', () => ({
  getTotalMemory: jest.fn(() => Promise.resolve(4 * 1024 * 1024 * 1024)),
}));

jest.mock('react-native-gifted-chat', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    GiftedChat: jest
      .fn()
      .mockImplementation(() => React.createElement(View, null)),
  };
});

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  KeyboardEvents: {
    addListener: jest.fn(),
  },
  KeyboardProvider: jest.fn().mockImplementation(({children}) => children),
}));

jest.mock('react-native-reanimated', () => {
  return {
    View: jest.fn().mockImplementation(({children}) => children),
    Text: jest.fn().mockImplementation(({children}) => children),
    Image: jest.fn().mockImplementation(({children}) => children),
    ScrollView: jest.fn().mockImplementation(({children}) => children),
    Extrapolate: {CLAMP: 'clamp'},
    interpolate: jest.fn(),
    useSharedValue: jest.fn().mockReturnValue({value: 0}),
    useAnimatedStyle: jest.fn().mockReturnValue({}),
    useAnimatedProps: jest.fn().mockReturnValue({}),
    withTiming: jest.fn(),
    withSpring: jest.fn(),
    withDecay: jest.fn(),
    withDelay: jest.fn(),
    withSequence: jest.fn(),
    withRepeat: jest.fn(),
    runOnJS: jest.fn(),
    runOnUI: jest.fn(),
    createAnimatedComponent: jest
      .fn()
      .mockImplementation(component => component),
    Easing: {
      bezier: jest.fn(),
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezierFn: jest.fn(),
      steps: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
  };
});

jest.mock('@expo/react-native-action-sheet', () => ({
  ActionSheetProvider: jest.fn().mockImplementation(({children}) => children),
  connectActionSheet: jest.fn().mockImplementation(component => component),
}));

jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(callback => {
      callback({
        executeSql: jest.fn((query, params, cb) => {
          if (cb) {
            cb(null, {rows: {length: 0, item: () => {}}});
          }
        }),
      });
    }),
  })),
}));
