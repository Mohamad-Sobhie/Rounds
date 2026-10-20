import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../index';

describe('HomeScreen', () => {
  it('renders a clock formatted by @rounds/core', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('1:30')).toBeTruthy();
  });
});
