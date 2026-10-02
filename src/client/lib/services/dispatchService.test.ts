import { describe, test, expect } from 'bun:test';
import {
  DISPATCH_PAYLOAD_SIZE_LIMIT,
  dispatchMetaFields,
  dispatchRequest,
  hasDispatchErrors,
  isDispatchedJob,
  isParameterized,
  validateDispatch,
} from './dispatchService';
import type { NomadParameterizedJobConfig } from '../../types/nomad';

const config: NomadParameterizedJobConfig = {
  Payload: 'optional',
  MetaRequired: ['database'],
  MetaOptional: ['compress'],
};

describe('isParameterized', () => {
  test('is true for a job with a parameterized block', () => {
    expect(isParameterized({ ParameterizedJob: config })).toBe(true);
  });

  test('is false for a job without the block', () => {
    expect(isParameterized({})).toBe(false);
    expect(isParameterized({ ParameterizedJob: null })).toBe(false);
  });

  // A dispatched job is a copy of its parent and keeps the block
  test('is false for a dispatched job', () => {
    expect(isParameterized({ ParameterizedJob: config, Dispatched: true })).toBe(false);
  });
});

describe('isDispatchedJob', () => {
  test('is true for a child job that a dispatch created', () => {
    expect(isDispatchedJob({ ID: 'export/dispatch-1790611797-8a1b2c3d', ParentID: 'export' })).toBe(true);
    // With an ID prefix template
    expect(isDispatchedJob({ ID: 'export/dispatch-nightly-1790611797-8a1b2c3d', ParentID: 'export' })).toBe(true);
  });

  test('is false for a periodic launch and for a job without a parent', () => {
    expect(isDispatchedJob({ ID: 'backup/periodic-1790611797', ParentID: 'backup' })).toBe(false);
    expect(isDispatchedJob({ ID: 'export', ParentID: '' })).toBe(false);
  });
});

describe('dispatchMetaFields', () => {
  test('lists the required keys first, then the optional ones', () => {
    expect(dispatchMetaFields(config)).toEqual([
      { key: 'database', required: true },
      { key: 'compress', required: false },
    ]);
  });

  // Nomad sends null for an empty list
  test('is empty for a job without meta keys', () => {
    expect(dispatchMetaFields({ Payload: 'required', MetaRequired: null, MetaOptional: null })).toEqual([]);
  });
});

describe('validateDispatch', () => {
  test('accepts required meta and no payload when the payload is optional', () => {
    const errors = validateDispatch(config, { database: 'orders' }, 0);

    expect(errors).toEqual({ meta: {} });
    expect(hasDispatchErrors(errors)).toBe(false);
  });

  test('asks for a missing or blank required meta key', () => {
    expect(validateDispatch(config, {}, 0).meta).toEqual({ database: 'Required' });
    expect(validateDispatch(config, { database: '  ' }, 0).meta).toEqual({ database: 'Required' });
    expect(hasDispatchErrors(validateDispatch(config, {}, 0))).toBe(true);
  });

  test('does not ask for an optional meta key', () => {
    expect(validateDispatch(config, { database: 'orders', compress: '' }, 0).meta).toEqual({});
  });

  test('asks for a payload when it is required', () => {
    const required = { ...config, Payload: 'required' as const };

    expect(validateDispatch(required, { database: 'orders' }, 0).payload).toBe('This job requires a payload');
    expect(validateDispatch(required, { database: 'orders' }, 1).payload).toBeUndefined();
  });

  test('rejects a payload over the limit of Nomad', () => {
    expect(DISPATCH_PAYLOAD_SIZE_LIMIT).toBe(16 * 1024);
    expect(validateDispatch(config, { database: 'orders' }, DISPATCH_PAYLOAD_SIZE_LIMIT).payload).toBeUndefined();
    expect(validateDispatch(config, { database: 'orders' }, DISPATCH_PAYLOAD_SIZE_LIMIT + 1).payload).toBe(
      'Payload is 16385 bytes, the limit is 16384'
    );
  });
});

describe('dispatchRequest', () => {
  const noPayload = new Uint8Array();

  test('sends the filled meta keys and leaves out the empty ones', () => {
    expect(dispatchRequest({ database: 'orders', compress: '' }, noPayload)).toEqual({
      Meta: { database: 'orders' },
    });
  });

  test('sends the payload as Base64', () => {
    const payload = new TextEncoder().encode('{"table":"заказы"}');

    expect(dispatchRequest({}, payload)).toEqual({
      Meta: {},
      Payload: 'eyJ0YWJsZSI6ItC30LDQutCw0LfRiyJ9',
    });
  });

  test('encodes binary bytes', () => {
    expect(dispatchRequest({}, new Uint8Array([0, 255, 128])).Payload).toBe('AP+A');
  });
});
