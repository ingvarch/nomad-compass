import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DispatchJobModal } from './DispatchJobModal';
import { PermissionError, getPermissionErrorMessage } from '../../../lib/errors';
import { DISPATCH_PAYLOAD_SIZE_LIMIT, type ParameterizedNomadJob } from '../../../lib/services/dispatchService';
import type {
  NomadJobDispatchRequest,
  NomadJobDispatchResponse,
  NomadParameterizedJobConfig,
} from '../../../types/nomad';

afterEach(() => {
  cleanup();
});

const reply: NomadJobDispatchResponse = {
  DispatchedJobID: 'export/dispatch-1790611797-8a1b2c3d',
  EvalID: 'eval-1',
  EvalCreateIndex: 7,
  JobCreateIndex: 6,
  Index: 7,
};

function exportJob(parameterized: Partial<NomadParameterizedJobConfig> = {}): ParameterizedNomadJob {
  return {
    ID: 'export', Name: 'export', Namespace: 'prod', Type: 'batch', Status: 'running', Stop: false,
    SubmitTime: 1790611000000000000, Version: 0, Priority: 50,
    Meta: { compress: 'gzip' },
    ParameterizedJob: { Payload: 'optional', MetaRequired: ['database'], MetaOptional: ['compress'], ...parameterized },
  };
}

// Renders the modal and records the dispatch requests and idempotency tokens
function renderModal(
  job: ParameterizedNomadJob,
  dispatch: () => Promise<NomadJobDispatchResponse> = async () => reply
) {
  const result = { requests: [] as NomadJobDispatchRequest[], tokens: [] as (string | undefined)[], closed: 0 };
  render(
    <MemoryRouter>
      <DispatchJobModal
        job={job}
        onClose={() => { result.closed++; }}
        onDispatch={(request, idempotencyToken) => {
          result.requests.push(request);
          result.tokens.push(idempotencyToken);
          return dispatch();
        }}
      />
    </MemoryRouter>
  );
  return result;
}

// The text field, not "Payload file"
const PAYLOAD_TEXT = /^Payload( \(optional\))?$/;

function type(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Dispatch' }));
}

describe('DispatchJobModal', () => {
  test('has a field for every meta key of the job and for the payload', () => {
    renderModal(exportJob());

    expect(screen.getByRole('heading', { name: 'Dispatch Job: export' })).toBeTruthy();
    expect(screen.getByLabelText('database')).toBeTruthy();
    expect(screen.getByLabelText('compress (optional)')).toBeTruthy();
    expect(screen.getByLabelText('Payload (optional)')).toBeTruthy();
  });

  // An empty optional key keeps the value the job has for it
  test('shows the value of the job as the placeholder of a meta key', () => {
    renderModal(exportJob());

    expect((screen.getByLabelText('compress (optional)') as HTMLInputElement).placeholder).toBe('gzip');
  });

  test('has no payload field when the job forbids a payload', () => {
    renderModal(exportJob({ Payload: 'forbidden' }));

    expect(screen.queryByLabelText(PAYLOAD_TEXT)).toBeNull();
    expect(screen.queryByLabelText('Payload file')).toBeNull();
  });

  test('says so when the job takes no parameters', async () => {
    const result = renderModal(exportJob({ Payload: 'forbidden', MetaRequired: null, MetaOptional: null }));

    expect(screen.getByText('This job takes no parameters.')).toBeTruthy();
    submit();

    await waitFor(() => expect(result.requests).toEqual([{ Meta: {} }]));
  });

  test('dispatches the meta and the payload text as Base64', async () => {
    const result = renderModal(exportJob());

    type(/^database/, 'orders');
    type(PAYLOAD_TEXT, 'hello');
    submit();

    await waitFor(() => expect(result.requests).toEqual([{ Meta: { database: 'orders' }, Payload: 'aGVsbG8=' }]));
  });

  test('asks for a missing required meta key and dispatches nothing', () => {
    const result = renderModal(exportJob());

    submit();

    expect(screen.getByText('Required')).toBeTruthy();
    expect(result.requests).toEqual([]);
  });

  test('shows no error before the first attempt and clears it once the key is filled', () => {
    renderModal(exportJob());
    expect(screen.queryByText('Required')).toBeNull();

    submit();
    type(/^database/, 'orders');

    expect(screen.queryByText('Required')).toBeNull();
  });

  test('asks for a payload when the job requires one', () => {
    const result = renderModal(exportJob({ Payload: 'required', MetaRequired: null }));

    expect(screen.getByLabelText('Payload')).toBeTruthy();
    submit();

    expect(screen.getByText('This job requires a payload')).toBeTruthy();
    expect(result.requests).toEqual([]);
  });

  test('dispatches an attached file instead of the text', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    type(PAYLOAD_TEXT, 'typed text');
    fireEvent.change(screen.getByLabelText('Payload file'), {
      target: { files: [new File([new Uint8Array([0, 255, 128])], 'params.bin')] },
    });

    expect(await screen.findByText('params.bin')).toBeTruthy();
    expect(screen.getByText('3 bytes')).toBeTruthy();
    // The file is the payload now
    expect(screen.queryByLabelText(PAYLOAD_TEXT)).toBeNull();
    submit();

    await waitFor(() => expect(result.requests).toEqual([{ Meta: {}, Payload: 'AP+A' }]));
  });

  test('goes back to the text when the file is removed', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    type(PAYLOAD_TEXT, 'hello');
    fireEvent.change(screen.getByLabelText('Payload file'), {
      target: { files: [new File(['from file'], 'params.txt')] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove file' }));
    submit();

    await waitFor(() => expect(result.requests).toEqual([{ Meta: {}, Payload: 'aGVsbG8=' }]));
  });

  test('rejects a payload over the limit of Nomad', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    fireEvent.change(screen.getByLabelText('Payload file'), {
      target: { files: [new File([new Uint8Array(DISPATCH_PAYLOAD_SIZE_LIMIT + 1)], 'big.bin')] },
    });
    await screen.findByText('big.bin');
    submit();

    expect(screen.getByText('Payload is 16385 bytes, the limit is 16384')).toBeTruthy();
    expect(result.requests).toEqual([]);
  });

  test('links to the dispatched job', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    submit();

    const link = await screen.findByRole('link', { name: 'Open Job' });
    expect(link.getAttribute('href')).toBe('/jobs/export%2Fdispatch-1790611797-8a1b2c3d?namespace=prod');
    expect(screen.getByText('export/dispatch-1790611797-8a1b2c3d')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).toBeNull();

    // Leaving for the job closes the dialog
    fireEvent.click(link);
    expect(result.closed).toBe(1);
  });

  test('shows the error of Nomad and keeps the form', async () => {
    renderModal(exportJob({ MetaRequired: null }), async () => {
      throw { statusCode: 500, message: 'Specified job "export" is stopped' };
    });

    submit();

    expect(await screen.findByText('Specified job "export" is stopped')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dispatch' })).toBeTruthy();
  });

  test('explains a permission error', async () => {
    renderModal(exportJob({ MetaRequired: null }), async () => {
      throw new PermissionError('Permission denied');
    });

    submit();

    expect(await screen.findByText(getPermissionErrorMessage('dispatch-job'))).toBeTruthy();
    expect(getPermissionErrorMessage('dispatch-job')).toContain('dispatch-job');
  });
});

describe('DispatchJobModal advanced options', () => {
  function openAdvanced() {
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
  }

  test('are hidden until opened', () => {
    renderModal(exportJob());

    const toggle = screen.getByRole('button', { name: 'Advanced' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText(/^Priority/)).toBeNull();

    openAdvanced();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // An empty priority keeps the priority of the job
    expect((screen.getByLabelText('Priority (optional)') as HTMLInputElement).placeholder).toBe('50');
    expect(screen.getByLabelText('Idempotency token (optional)')).toBeTruthy();
  });

  test('dispatch with a priority and an idempotency token', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    openAdvanced();
    type(/^Priority/, '80');
    type(/^Idempotency token/, ' nightly-2026-10-02 ');
    submit();

    await waitFor(() => expect(result.requests).toEqual([{ Meta: {}, Priority: 80 }]));
    expect(result.tokens).toEqual(['nightly-2026-10-02']);
  });

  test('send no token when the field is empty', async () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    submit();

    await waitFor(() => expect(result.tokens).toEqual([undefined]));
  });

  test('reject a priority that is not a whole number of 1 or more', () => {
    const result = renderModal(exportJob({ MetaRequired: null }));

    openAdvanced();
    type(/^Priority/, '0');
    submit();

    expect(screen.getByText('Priority must be a whole number of 1 or more')).toBeTruthy();
    expect(result.requests).toEqual([]);
  });

  // Nomad answers a known token with the job it dispatched for it, without a new evaluation
  test('say so when the token was used before', async () => {
    renderModal(exportJob({ MetaRequired: null }), async () => ({ ...reply, EvalID: '', EvalCreateIndex: 0 }));

    openAdvanced();
    type(/^Idempotency token/, 'nightly-2026-10-02');
    submit();

    expect(await screen.findByText('Already dispatched with this token')).toBeTruthy();
    expect(screen.getByText(reply.DispatchedJobID)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Job' })).toBeTruthy();
  });
});
