import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Paperclip, X } from 'lucide-react';
import { Modal, Button, ErrorAlert } from '../../ui';
import { getErrorMessage } from '../../../lib/errors';
import {
  dispatchMetaFields,
  dispatchRequest,
  hasDispatchErrors,
  validateDispatch,
  type ParameterizedNomadJob,
} from '../../../lib/services/dispatchService';
import { jobPath } from '../../../lib/utils/jobPath';
import { buttonPrimaryStyles, inputErrorStyles, inputStyles, labelStyles } from '../../../lib/styles';
import type { NomadJobDispatchRequest, NomadJobDispatchResponse } from '../../../types/nomad';

interface DispatchJobModalProps {
  job: ParameterizedNomadJob;
  onClose: () => void;
  onDispatch: (request: NomadJobDispatchRequest) => Promise<NomadJobDispatchResponse>;
}

interface PayloadFile {
  name: string;
  bytes: Uint8Array;
}

const textEncoder = new TextEncoder();

function OptionalMark() {
  return <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>;
}

/**
 * Form for the meta keys and the payload a parameterized job accepts; after the dispatch, a link to the new job.
 */
export function DispatchJobModal({ job, onClose, onDispatch }: DispatchJobModalProps) {
  const config = job.ParameterizedJob;
  const metaFields = dispatchMetaFields(config);
  const acceptsPayload = config.Payload !== 'forbidden';

  const [meta, setMeta] = useState<Record<string, string>>({});
  const [payloadText, setPayloadText] = useState('');
  const [payloadFile, setPayloadFile] = useState<PayloadFile | null>(null);
  // Errors show only after the first attempt to dispatch
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<NomadJobDispatchResponse | null>(null);

  const payload = payloadFile ? payloadFile.bytes : textEncoder.encode(payloadText);
  const errors = validateDispatch(config, meta, payload.length);
  const shownErrors = attempted ? errors : { meta: {} as Record<string, string> };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPayloadFile({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    // The same file can be picked again after Remove
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (hasDispatchErrors(errors) || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      setDispatched(await onDispatch(dispatchRequest(meta, payload)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to dispatch job', 'dispatch-job'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Dispatch Job: ${job.ID}`} size="md">
      {dispatched ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Job dispatched</p>
              <p className="mt-1 text-xs font-mono break-all text-green-700 dark:text-green-400">
                {dispatched.DispatchedJobID}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Link
              to={jobPath(dispatched.DispatchedJobID, job.Namespace)}
              onClick={onClose}
              className={`${buttonPrimaryStyles} shadow-sm`}
            >
              Open Job
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <ErrorAlert message={error} />}

          {metaFields.length === 0 && !acceptsPayload && (
            <p className="text-sm text-gray-600 dark:text-gray-400">This job takes no parameters.</p>
          )}

          {metaFields.map(({ key, required }) => {
            const id = `dispatch-meta-${key}`;
            const fieldError = shownErrors.meta[key];
            return (
              <div key={key}>
                <label htmlFor={id} className={`${labelStyles} font-mono`}>
                  {key}
                  {!required && (
                    <>
                      {' '}
                      <OptionalMark />
                    </>
                  )}
                </label>
                <input
                  id={id}
                  type="text"
                  value={meta[key] ?? ''}
                  onChange={(e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={job.Meta?.[key]}
                  disabled={isSubmitting}
                  className={fieldError ? inputErrorStyles : inputStyles}
                />
                <FieldError message={fieldError} />
              </div>
            );
          })}

          {acceptsPayload && (
            <div>
              {payloadFile ? (
                <>
                  <span className={labelStyles}>
                    Payload {config.Payload === 'optional' && <OptionalMark />}
                  </span>
                  <div className="flex items-center gap-2 p-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 text-sm">
                    <Paperclip className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="min-w-0 truncate font-mono text-gray-900 dark:text-gray-100">{payloadFile.name}</span>
                    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{payloadFile.bytes.length} bytes</span>
                    <button
                      type="button"
                      onClick={() => setPayloadFile(null)}
                      disabled={isSubmitting}
                      aria-label="Remove file"
                      title="Remove file"
                      className="ml-auto inline-flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor="dispatch-payload" className={labelStyles}>
                    Payload {config.Payload === 'optional' && <OptionalMark />}
                  </label>
                  <textarea
                    id="dispatch-payload"
                    rows={4}
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    disabled={isSubmitting}
                    className={`${shownErrors.payload ? inputErrorStyles : inputStyles} font-mono text-sm`}
                  />
                </>
              )}
              <FieldError message={shownErrors.payload} />
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Text or a file, up to 16 KiB.</span>
                <label
                  htmlFor="dispatch-payload-file"
                  // Padding widens the tap target without moving the row
                  className="shrink-0 -my-3 py-3 cursor-pointer font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Attach File
                </label>
                <input
                  id="dispatch-payload-file"
                  type="file"
                  aria-label="Payload file"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="sr-only"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Dispatch
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
