import { parseDuration } from '../duration';

describe('parseDuration', () => {
  it.each([
    ['45', 45],
    ['90', 90],
    ['1:30', 90],
    ['0:05', 5],
    ['10:00', 600],
    ['1:02:00', 3720],
    [' 2:00 ', 120],
  ])('parses "%s" as %i seconds', (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  it.each(['', '0', '0:00', 'abc', '1:60', '1:2:3:4', '-5', '1.5'])('rejects "%s"', (text) => {
    expect(parseDuration(text)).toBeNull();
  });
});
