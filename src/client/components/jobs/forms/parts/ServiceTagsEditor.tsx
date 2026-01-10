import React from 'react';
import { Trash, Plus } from 'lucide-react';
import { NomadServiceTag } from '../../../../types/nomad';
import { inputFlexStyles, inputMonoStyles } from '../../../../lib/styles';

interface ServiceTagsEditorProps {
  tags: NomadServiceTag[];
  onTagChange: (tagIndex: number, field: 'key' | 'value', value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagIndex: number) => void;
  isLoading: boolean;
}

// Common Traefik tag templates for quick selection
const TRAEFIK_TAG_TEMPLATES = [
  { key: 'traefik.enable', value: 'true', description: 'Enable Traefik routing' },
  { key: 'traefik.http.routers.{name}.rule', value: 'Host(`example.com`)', description: 'Host-based routing' },
  { key: 'traefik.http.routers.{name}.entrypoints', value: 'websecure', description: 'HTTPS entrypoint' },
  { key: 'traefik.http.routers.{name}.tls.certresolver', value: 'letsencrypt', description: 'Let\'s Encrypt SSL' },
];

export const ServiceTagsEditor: React.FC<ServiceTagsEditorProps> = ({
  tags,
  onTagChange,
  onAddTag,
  onRemoveTag,
  isLoading
}) => {
  const handleAddTemplate = (template: typeof TRAEFIK_TAG_TEMPLATES[0]) => {
    // Add a new tag with template values
    const newIndex = tags.length;
    onTagChange(newIndex, 'key', template.key);
    // Delay to ensure the tag is created first
    setTimeout(() => onTagChange(newIndex, 'value', template.value), 0);
  };

  return (
    <div className="space-y-3">
      {/* Quick Add Templates */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Quick add:</span>
        {TRAEFIK_TAG_TEMPLATES.map((template, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAddTemplate(template)}
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            disabled={isLoading}
            title={template.description}
          >
            {template.key.replace('traefik.', '').replace('.{name}', '')}
          </button>
        ))}
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="flex space-x-2 items-center">
          <input
            type="text"
            value=""
            onChange={(e) => onTagChange(0, 'key', e.target.value)}
            placeholder="traefik.enable"
            className={inputFlexStyles}
            disabled={isLoading}
          />
          <span className="text-gray-500">=</span>
          <input
            type="text"
            value=""
            onChange={(e) => onTagChange(0, 'value', e.target.value)}
            placeholder="true"
            className={inputFlexStyles}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={onAddTag}
            className="inline-flex items-center justify-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-10 h-10"
            disabled={isLoading}
          >
            <Plus size={16} />
          </button>
        </div>
      ) : (
        tags.map((tag, index) => (
          <div key={index} className="flex space-x-2 items-center">
            <input
              type="text"
              value={tag.key}
              onChange={(e) => onTagChange(index, 'key', e.target.value)}
              placeholder="traefik.enable"
              className={inputMonoStyles}
              disabled={isLoading}
            />
            <span className="text-gray-500">=</span>
            <input
              type="text"
              value={tag.value}
              onChange={(e) => onTagChange(index, 'value', e.target.value)}
              placeholder="true"
              className={inputMonoStyles}
              disabled={isLoading}
            />
            {index === tags.length - 1 ? (
              <button
                type="button"
                onClick={onAddTag}
                className="inline-flex items-center justify-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-10 h-10"
                disabled={isLoading}
              >
                <Plus size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemoveTag(index)}
                className="inline-flex items-center justify-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-10 h-10"
                disabled={isLoading}
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        ))
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Service tags are used by Traefik for routing. Format: key=value
      </p>
    </div>
  );
};

export default ServiceTagsEditor;
