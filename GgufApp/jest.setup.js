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
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) }))
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
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(callback => {
      callback({
        executeSql: jest.fn((query, params, cb) => {
          if (cb) cb(null, { rows: { length: 0, item: () => {} } });
        })
      });
    }),
  })),
}));
