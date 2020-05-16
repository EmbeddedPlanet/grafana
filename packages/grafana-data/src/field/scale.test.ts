import { Field, FieldType, ThresholdsConfig, ThresholdsMode, FieldColorMode, FieldConfig } from '../types';
import { sortThresholds, getScaleCalculator, getActiveThreshold } from './scale';
import { ArrayVector } from '../vector';
import { validateFieldConfig } from './fieldOverrides';

describe('scale', () => {
  test('sort thresholds', () => {
    const thresholds: ThresholdsConfig = {
      steps: [
        { color: 'TEN', value: 10 },
        { color: 'HHH', value: 100 },
        { color: 'ONE', value: 1 },
      ],
      mode: ThresholdsMode.Absolute,
    };
    const sorted = sortThresholds(thresholds.steps).map(t => t.value);
    expect(sorted).toEqual([1, 10, 100]);
    const config: FieldConfig = { thresholds };

    // Mutates and sorts the
    validateFieldConfig(config);
    expect(getActiveThreshold(10, thresholds.steps).color).toEqual('TEN');
  });

  test('find active', () => {
    const thresholds: ThresholdsConfig = {
      steps: [
        { color: 'ONE', value: 1 },
        { color: 'TEN', value: 10 },
        { color: 'HHH', value: 100 },
      ],
      mode: ThresholdsMode.Absolute,
    };
    const config: FieldConfig = { thresholds };
    // Mutates and sets ONE to -Infinity
    validateFieldConfig(config);
    expect(getActiveThreshold(-1, thresholds.steps).color).toEqual('ONE');
    expect(getActiveThreshold(1, thresholds.steps).color).toEqual('ONE');
    expect(getActiveThreshold(5, thresholds.steps).color).toEqual('ONE');
    expect(getActiveThreshold(10, thresholds.steps).color).toEqual('TEN');
    expect(getActiveThreshold(11, thresholds.steps).color).toEqual('TEN');
    expect(getActiveThreshold(99, thresholds.steps).color).toEqual('TEN');
    expect(getActiveThreshold(100, thresholds.steps).color).toEqual('HHH');
    expect(getActiveThreshold(1000, thresholds.steps).color).toEqual('HHH');
  });

  test('absolute thresholds', () => {
    const thresholds: ThresholdsConfig = {
      steps: [
        // Colors are ignored when 'scheme' exists
        { color: '#F00', state: 'LowLow', value: -Infinity },
        { color: '#F00', state: 'Low', value: -50 },
        { color: '#F00', state: 'OK', value: 0 },
        { color: '#F00', state: 'High', value: 50 },
        { color: '#F00', state: 'HighHigh', value: 100 },
      ],
      mode: ThresholdsMode.Absolute,
    };

    const field: Field<number> = {
      name: 'test',
      type: FieldType.number,
      config: {
        min: -100, // explicit range
        max: 100, // note less then range of actual data
        thresholds,
        color: {
          mode: FieldColorMode.Thresholds,
        },
      },
      values: new ArrayVector([
        -1000,
        -25,
        0, // middle
        25,
        55,
        1000,
      ]),
    };
    validateFieldConfig(field.config);
    const calc = getScaleCalculator(field);
    const mapped = field.values.toArray().map(v => {
      return calc(v);
    });
    expect(mapped).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "LowLow",
            "value": -Infinity,
          },
        },
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "Low",
            "value": -50,
          },
        },
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "OK",
            "value": 0,
          },
        },
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "OK",
            "value": 0,
          },
        },
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "High",
            "value": 50,
          },
        },
        Object {
          "color": "#F00",
          "threshold": Object {
            "color": "#F00",
            "state": "HighHigh",
            "value": 100,
          },
        },
      ]
    `);
  });

  test('color scheme', () => {
    const field: Field<number> = {
      name: 'test',
      type: FieldType.number,
      config: {
        color: {
          mode: FieldColorMode.SchemeBlues,
        },
      },
      values: new ArrayVector([0, 100, 1000]),
    };

    validateFieldConfig(field.config);
    const calc = getScaleCalculator(field);
    const mapped = field.values.toArray().map(v => {
      return calc(v);
    });

    expect(mapped).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "rgb(31, 96, 196)",
        },
        Object {
          "color": "rgb(47, 108, 202)",
        },
        Object {
          "color": "rgb(192, 216, 255)",
        },
      ]
    `);
  });
});
