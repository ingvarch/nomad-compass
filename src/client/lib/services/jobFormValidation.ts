import type { NomadJobFormData } from '../../types/nomad';
import { JOB_NAME_REGEX, JOB_NAME_ERROR } from '../constants';

// Form validation
export function validateJobForm(formData: NomadJobFormData | null, mode: 'create' | 'edit'): string | null {
  if (!formData) return 'Form data is missing';

  if (mode === 'create') {
    if (!formData.name.trim()) return 'Job name is required';
    if (!JOB_NAME_REGEX.test(formData.name)) {
      return JOB_NAME_ERROR;
    }
  }

  if (formData.periodic && !formData.periodic.crons.some((cron) => cron.trim() !== '')) {
    return 'Add at least one cron expression to the schedule';
  }

  for (let i = 0; i < formData.taskGroups.length; i++) {
    const group = formData.taskGroups[i];
    if (!group.name.trim()) return `Group ${i + 1} name is required`;

    for (let t = 0; t < group.tasks.length; t++) {
      const task = group.tasks[t];
      if (!task.name.trim()) return `Task ${t + 1} name is required in group ${i + 1}`;
      if (!task.image.trim()) return `Image for task ${t + 1} in group ${i + 1} is required`;

      if (task.usePrivateRegistry) {
        if (!task.dockerAuth?.username)
          return `Username is required for private registry in task ${t + 1} of group ${i + 1}`;
        if (!task.dockerAuth?.password)
          return `Password is required for private registry in task ${t + 1} of group ${i + 1}`;
      }
    }

    if (group.enableNetwork && group.ports.length > 0) {
      for (let j = 0; j < group.ports.length; j++) {
        const port = group.ports[j];
        if (!port.label) return `Port label is required for port ${j + 1} in group ${i + 1}`;
        if (port.static && (!port.value || port.value <= 0 || port.value > 65535)) {
          return `Valid port value (1-65535) is required for static port ${j + 1} in group ${i + 1}`;
        }
      }
    }
  }
  return null;
}
