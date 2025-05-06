import { expect, test } from '@jest/globals';
import { props } from '../props.js';

test('props stop gap', () => {
  expect(props).not.toBeNull();
}); 