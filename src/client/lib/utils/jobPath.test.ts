import { describe, test, expect } from 'bun:test';
import { matchRoutes } from 'react-router-dom';
import { jobPath, jobClonePath } from './jobPath';

describe('jobPath', () => {
  test('encodes a job ID with a slash', () => {
    expect(jobPath('backup/periodic-1790611797', 'default')).toBe(
      '/jobs/backup%2Fperiodic-1790611797?namespace=default'
    );
  });

  test('adds the edit view', () => {
    expect(jobPath('web', 'prod', 'edit')).toBe('/jobs/web/edit?namespace=prod');
  });

  test('builds the clone path', () => {
    expect(jobClonePath('backup/periodic-1', 'default')).toBe(
      '/jobs/create?clone=backup%2Fperiodic-1&namespace=default'
    );
  });

  test('the router reads the encoded ID back', () => {
    const pathname = jobPath('backup/periodic-1', 'default', 'edit').split('?')[0];
    const [match] = matchRoutes([{ path: '/jobs/:id' }, { path: '/jobs/:id/edit' }], pathname)!;

    expect(match.route.path).toBe('/jobs/:id/edit');
    expect(match.params.id).toBe('backup/periodic-1');
  });
});
