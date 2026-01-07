import { NomadJobDiff, NomadFieldDiff, NomadObjectDiff, NomadTaskGroupDiff, NomadTaskDiff } from '../types/nomad';

// Types for HCL-style diff rendering
export interface HclLine {
  prefix: '+' | '-' | ' ';
  indent: number;
  content: string;
  type: 'added' | 'deleted' | 'none';
}

export interface GroupedFields {
  simple: NomadFieldDiff[];
  blocks: Map<string, NomadFieldDiff[]>;
}

// HCL keywords for syntax highlighting
export const HCL_KEYWORDS = [
  'job', 'group', 'task', 'config', 'env', 'meta', 'network',
  'service', 'check', 'resources', 'template', 'volume', 'artifact',
  'constraint', 'affinity', 'spread', 'update', 'migrate', 'reschedule',
  'restart', 'vault', 'identity', 'scaling', 'lifecycle'
];

// Utility: Parse field names like "Env[FOO]" into { block: "env", key: "FOO" }
export function parseFieldName(name: string): { block: string | null; key: string } {
  const match = name.match(/^(\w+)\[(.+)\]$/);
  if (match) {
    return { block: match[1].toLowerCase(), key: match[2] };
  }
  return { block: null, key: name };
}

// Utility: Group indexed fields by block type
export function groupFields(fields: NomadFieldDiff[]): GroupedFields {
  const result: GroupedFields = { simple: [], blocks: new Map() };

  for (const field of fields) {
    if (field.Type === 'None') continue;
    const { block, key } = parseFieldName(field.Name);
    if (block) {
      if (!result.blocks.has(block)) {
        result.blocks.set(block, []);
      }
      result.blocks.get(block)!.push({ ...field, Name: key });
    } else {
      result.simple.push(field);
    }
  }

  return result;
}

// Utility: Convert PascalCase/camelCase to snake_case for HCL
// Handles acronyms correctly: HTTPPort -> http_port, DiskMB -> disk_mb
export function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')  // HTTPPort -> HTTP_Port
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')      // myValue -> my_Value, disk2MB -> disk2_MB
    .toLowerCase();
}

// Utility: Format value with smart quoting
export function formatValue(value: string): string {
  if (value === 'true' || value === 'false') return value;
  if (/^\d+$/.test(value)) return value;
  if (/^\d+\.\d+$/.test(value)) return value;
  return `"${value}"`;
}

// Get diff type from field
export function getDiffType(type: string): 'added' | 'deleted' | 'none' {
  if (type === 'Added') return 'added';
  if (type === 'Deleted') return 'deleted';
  return 'none';
}

// Get prefix for diff type
export function getPrefix(type: string): '+' | '-' | ' ' {
  if (type === 'Added') return '+';
  if (type === 'Deleted') return '-';
  return ' ';
}

// HCL Generator: Render a single field as HCL assignment
export function renderFieldAsHcl(field: NomadFieldDiff, indent: number): HclLine[] {
  const lines: HclLine[] = [];
  const key = toSnakeCase(field.Name);

  if (field.Type === 'Edited') {
    if (field.Old) {
      lines.push({
        prefix: '-',
        indent,
        content: `${key} = ${formatValue(field.Old)}`,
        type: 'deleted'
      });
    }
    if (field.New) {
      lines.push({
        prefix: '+',
        indent,
        content: `${key} = ${formatValue(field.New)}`,
        type: 'added'
      });
    }
  } else {
    const value = field.Type === 'Deleted' ? field.Old : field.New;
    if (value) {
      lines.push({
        prefix: getPrefix(field.Type),
        indent,
        content: `${key} = ${formatValue(value)}`,
        type: getDiffType(field.Type)
      });
    }
  }

  return lines;
}

// HCL Generator: Render grouped fields as a block (env, meta, etc.)
export function renderBlockFields(blockName: string, fields: NomadFieldDiff[], indent: number, parentType: string): HclLine[] {
  if (fields.length === 0) return [];

  const lines: HclLine[] = [];
  const blockType = parentType === 'Edited' ? 'none' : getDiffType(parentType);
  const blockPrefix = parentType === 'Edited' ? ' ' : getPrefix(parentType);

  // Opening brace
  lines.push({ prefix: blockPrefix, indent, content: `${blockName} {`, type: blockType });

  // Fields inside block
  for (const field of fields) {
    const fieldLines = renderFieldAsHcl(field, indent + 1);
    lines.push(...fieldLines);
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process object diff recursively
export function processObjectDiff(obj: NomadObjectDiff, indent: number): HclLine[] {
  if (obj.Type === 'None') return [];

  const lines: HclLine[] = [];
  const hclName = toSnakeCase(obj.Name);

  // For edited objects, we show the block structure without prefix on braces
  const blockPrefix = obj.Type === 'Edited' ? ' ' : getPrefix(obj.Type);
  const blockType = obj.Type === 'Edited' ? 'none' : getDiffType(obj.Type);

  // Opening brace
  lines.push({ prefix: blockPrefix, indent, content: `${hclName} {`, type: blockType });

  // Process fields
  if (obj.Fields) {
    const grouped = groupFields(obj.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks (env, meta, etc.)
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, obj.Type));
    }
  }

  // Nested objects
  if (obj.Objects) {
    for (const nested of obj.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(nested, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process task diff
export function processTaskDiff(task: NomadTaskDiff, indent: number): HclLine[] {
  if (task.Type === 'None') return [];

  const lines: HclLine[] = [];

  const blockPrefix = task.Type === 'Edited' ? ' ' : getPrefix(task.Type);
  const blockType = task.Type === 'Edited' ? 'none' : getDiffType(task.Type);

  // Opening: task "name" {
  lines.push({ prefix: blockPrefix, indent, content: `task "${task.Name}" {`, type: blockType });

  // Process fields
  if (task.Fields) {
    const grouped = groupFields(task.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, task.Type));
    }
  }

  // Nested objects (config, resources, etc.)
  if (task.Objects) {
    for (const obj of task.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process task group diff
export function processTaskGroupDiff(tg: NomadTaskGroupDiff, indent: number): HclLine[] {
  if (tg.Type === 'None') return [];

  const lines: HclLine[] = [];

  const blockPrefix = tg.Type === 'Edited' ? ' ' : getPrefix(tg.Type);
  const blockType = tg.Type === 'Edited' ? 'none' : getDiffType(tg.Type);

  // Opening: group "name" {
  lines.push({ prefix: blockPrefix, indent, content: `group "${tg.Name}" {`, type: blockType });

  // Process fields
  if (tg.Fields) {
    const grouped = groupFields(tg.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, tg.Type));
    }
  }

  // Group-level objects (network, etc.)
  if (tg.Objects) {
    for (const obj of tg.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, indent + 1));
    }
  }

  // Tasks
  if (tg.Tasks) {
    for (const task of tg.Tasks.filter(t => t.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processTaskDiff(task, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Entry point - process entire job diff
export function processJobDiff(diff: NomadJobDiff): HclLine[] {
  if (diff.Type === 'None') return [];

  const lines: HclLine[] = [];

  // Job-level fields
  if (diff.Fields) {
    const grouped = groupFields(diff.Fields);
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, 0));
    }
    for (const [blockName, blockFields] of grouped.blocks) {
      lines.push(...renderBlockFields(blockName, blockFields, 0, diff.Type));
    }
  }

  // Job-level objects
  if (diff.Objects) {
    for (const obj of diff.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 0) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, 0));
    }
  }

  // Task groups
  if (diff.TaskGroups) {
    for (const tg of diff.TaskGroups.filter(t => t.Type !== 'None')) {
      if (lines.length > 0) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processTaskGroupDiff(tg, 0));
    }
  }

  return lines;
}
