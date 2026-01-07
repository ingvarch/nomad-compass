import { describe, test, expect } from 'bun:test';
import {
  parseFieldName,
  groupFields,
  toSnakeCase,
  formatValue,
  getDiffType,
  getPrefix,
  renderFieldAsHcl,
  HCL_KEYWORDS
} from './hclDiffRenderer';
import type { NomadFieldDiff } from '../types/nomad';

describe('toSnakeCase', () => {
  test('simple PascalCase', () => {
    expect(toSnakeCase('Count')).toBe('count');
    expect(toSnakeCase('Name')).toBe('name');
    expect(toSnakeCase('Driver')).toBe('driver');
  });

  test('multi-word PascalCase', () => {
    expect(toSnakeCase('PortLabel')).toBe('port_label');
    expect(toSnakeCase('TaskName')).toBe('task_name');
    expect(toSnakeCase('MaxParallel')).toBe('max_parallel');
  });

  test('acronyms at start', () => {
    expect(toSnakeCase('HTTPPort')).toBe('http_port');
    expect(toSnakeCase('CPUShares')).toBe('cpu_shares');
    expect(toSnakeCase('IOPriority')).toBe('io_priority');
  });

  test('acronyms at end', () => {
    expect(toSnakeCase('DiskMB')).toBe('disk_mb');
    expect(toSnakeCase('MemoryMB')).toBe('memory_mb');
    expect(toSnakeCase('NetworkMbits')).toBe('network_mbits');
  });

  test('single uppercase word', () => {
    expect(toSnakeCase('CPU')).toBe('cpu');
    expect(toSnakeCase('ID')).toBe('id');
  });

  test('already lowercase', () => {
    expect(toSnakeCase('count')).toBe('count');
    expect(toSnakeCase('name')).toBe('name');
  });

  test('mixed with numbers', () => {
    expect(toSnakeCase('Port80')).toBe('port80');
    expect(toSnakeCase('Disk2GB')).toBe('disk2_gb');
  });
});

describe('parseFieldName', () => {
  test('indexed fields with brackets', () => {
    expect(parseFieldName('Env[FOO]')).toEqual({ block: 'env', key: 'FOO' });
    expect(parseFieldName('Meta[service_name]')).toEqual({ block: 'meta', key: 'service_name' });
    expect(parseFieldName('Config[image]')).toEqual({ block: 'config', key: 'image' });
  });

  test('simple fields without brackets', () => {
    expect(parseFieldName('Count')).toEqual({ block: null, key: 'Count' });
    expect(parseFieldName('Driver')).toEqual({ block: null, key: 'Driver' });
    expect(parseFieldName('Name')).toEqual({ block: null, key: 'Name' });
  });

  test('nested bracket values', () => {
    expect(parseFieldName('Labels[com.example.key]')).toEqual({
      block: 'labels',
      key: 'com.example.key'
    });
  });
});

describe('formatValue', () => {
  test('integers unquoted', () => {
    expect(formatValue('123')).toBe('123');
    expect(formatValue('0')).toBe('0');
    expect(formatValue('999999')).toBe('999999');
  });

  test('floats unquoted', () => {
    expect(formatValue('3.14')).toBe('3.14');
    expect(formatValue('0.5')).toBe('0.5');
    expect(formatValue('100.0')).toBe('100.0');
  });

  test('booleans unquoted', () => {
    expect(formatValue('true')).toBe('true');
    expect(formatValue('false')).toBe('false');
  });

  test('strings quoted', () => {
    expect(formatValue('hello')).toBe('"hello"');
    expect(formatValue('nginx:latest')).toBe('"nginx:latest"');
    expect(formatValue('/usr/bin/app')).toBe('"/usr/bin/app"');
  });

  test('numeric-like strings quoted', () => {
    expect(formatValue('123abc')).toBe('"123abc"');
    expect(formatValue('v1.2.3')).toBe('"v1.2.3"');
  });
});

describe('getDiffType', () => {
  test('maps Nomad types to HCL types', () => {
    expect(getDiffType('Added')).toBe('added');
    expect(getDiffType('Deleted')).toBe('deleted');
    expect(getDiffType('Edited')).toBe('none');
    expect(getDiffType('None')).toBe('none');
  });
});

describe('getPrefix', () => {
  test('maps Nomad types to diff prefixes', () => {
    expect(getPrefix('Added')).toBe('+');
    expect(getPrefix('Deleted')).toBe('-');
    expect(getPrefix('Edited')).toBe(' ');
    expect(getPrefix('None')).toBe(' ');
  });
});

describe('groupFields', () => {
  test('separates simple and indexed fields', () => {
    const fields: NomadFieldDiff[] = [
      { Type: 'Added', Name: 'Count', Old: '', New: '2' },
      { Type: 'Added', Name: 'Env[FOO]', Old: '', New: 'bar' },
      { Type: 'Added', Name: 'Env[BAZ]', Old: '', New: 'qux' },
      { Type: 'Added', Name: 'Driver', Old: '', New: 'docker' }
    ];

    const result = groupFields(fields);

    expect(result.simple).toHaveLength(2);
    expect(result.simple[0].Name).toBe('Count');
    expect(result.simple[1].Name).toBe('Driver');

    expect(result.blocks.has('env')).toBe(true);
    expect(result.blocks.get('env')).toHaveLength(2);
    expect(result.blocks.get('env')![0].Name).toBe('FOO');
    expect(result.blocks.get('env')![1].Name).toBe('BAZ');
  });

  test('filters out None type fields', () => {
    const fields: NomadFieldDiff[] = [
      { Type: 'None', Name: 'Count', Old: '1', New: '1' },
      { Type: 'Added', Name: 'Driver', Old: '', New: 'docker' }
    ];

    const result = groupFields(fields);

    expect(result.simple).toHaveLength(1);
    expect(result.simple[0].Name).toBe('Driver');
  });

  test('handles multiple block types', () => {
    const fields: NomadFieldDiff[] = [
      { Type: 'Added', Name: 'Env[FOO]', Old: '', New: 'bar' },
      { Type: 'Added', Name: 'Meta[version]', Old: '', New: '1.0' },
      { Type: 'Added', Name: 'Env[BAZ]', Old: '', New: 'qux' }
    ];

    const result = groupFields(fields);

    expect(result.blocks.has('env')).toBe(true);
    expect(result.blocks.has('meta')).toBe(true);
    expect(result.blocks.get('env')).toHaveLength(2);
    expect(result.blocks.get('meta')).toHaveLength(1);
  });
});

describe('renderFieldAsHcl', () => {
  test('renders added field', () => {
    const field: NomadFieldDiff = { Type: 'Added', Name: 'Count', Old: '', New: '2' };
    const lines = renderFieldAsHcl(field, 0);

    expect(lines).toHaveLength(1);
    expect(lines[0].prefix).toBe('+');
    expect(lines[0].content).toBe('count = 2');
    expect(lines[0].type).toBe('added');
  });

  test('renders deleted field', () => {
    const field: NomadFieldDiff = { Type: 'Deleted', Name: 'Driver', Old: 'docker', New: '' };
    const lines = renderFieldAsHcl(field, 1);

    expect(lines).toHaveLength(1);
    expect(lines[0].prefix).toBe('-');
    expect(lines[0].content).toBe('driver = "docker"');
    expect(lines[0].type).toBe('deleted');
    expect(lines[0].indent).toBe(1);
  });

  test('renders edited field as two lines', () => {
    const field: NomadFieldDiff = { Type: 'Edited', Name: 'Count', Old: '1', New: '3' };
    const lines = renderFieldAsHcl(field, 0);

    expect(lines).toHaveLength(2);
    expect(lines[0].prefix).toBe('-');
    expect(lines[0].content).toBe('count = 1');
    expect(lines[0].type).toBe('deleted');
    expect(lines[1].prefix).toBe('+');
    expect(lines[1].content).toBe('count = 3');
    expect(lines[1].type).toBe('added');
  });

  test('converts field name to snake_case', () => {
    const field: NomadFieldDiff = { Type: 'Added', Name: 'MaxParallel', Old: '', New: '5' };
    const lines = renderFieldAsHcl(field, 0);

    expect(lines[0].content).toBe('max_parallel = 5');
  });
});

describe('HCL_KEYWORDS', () => {
  test('contains essential HCL block keywords', () => {
    expect(HCL_KEYWORDS).toContain('job');
    expect(HCL_KEYWORDS).toContain('group');
    expect(HCL_KEYWORDS).toContain('task');
    expect(HCL_KEYWORDS).toContain('config');
    expect(HCL_KEYWORDS).toContain('env');
    expect(HCL_KEYWORDS).toContain('network');
    expect(HCL_KEYWORDS).toContain('service');
    expect(HCL_KEYWORDS).toContain('resources');
  });
});
