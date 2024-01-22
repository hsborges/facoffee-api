import { ColumnNumericTransformer } from './transformer';

describe('ColumnNumericTransformer', () => {
  const transformer = new ColumnNumericTransformer();

  it('deve transformar number to number', () => {
    expect(transformer.to(1)).toBe(1);
    expect(transformer.to(0.01)).toBe(0.01);
    expect(transformer.to(0)).toBe(0);
    expect(transformer.to(-0.01)).toBe(-0.01);
    expect(transformer.to(-1)).toBe(-1);
  });

  it('deve transformar string to number', () => {
    expect(transformer.from('1')).toBe(1);
    expect(transformer.from('0.01')).toBe(0.01);
    expect(transformer.from('0')).toBe(0);
    expect(transformer.from('-0.01')).toBe(-0.01);
    expect(transformer.from('-1')).toBe(-1);
  });
});
