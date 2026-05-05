export default {
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
  })),
};
