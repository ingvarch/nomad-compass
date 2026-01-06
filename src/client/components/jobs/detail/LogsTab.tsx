import JobLogs from '../JobLogs';

interface LogsTabProps {
  jobId: string;
  initialTaskGroup: string | null;
}

export function LogsTab({ jobId, initialTaskGroup }: LogsTabProps) {
  return (
    <div className="py-4">
      <JobLogs jobId={jobId} initialTaskGroup={initialTaskGroup} />
    </div>
  );
}
