import 'react-native';
import React from 'react';
import App from '../App';
import {it} from '@jest/globals';
import renderer from 'react-test-renderer';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

it('renders correctly', () => {
  const tree = renderer.create(<App />);
  tree.unmount();
});
