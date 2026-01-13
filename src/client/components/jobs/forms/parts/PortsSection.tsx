import React from 'react';
import { Trash, Plus } from 'lucide-react';
import { NomadPort } from '../../../../types/nomad';
import { inputStyles, selectStyles, labelSmallStyles } from '../../../../lib/styles';

interface PortRowProps {
  port: NomadPort;
  index: number;
  isLast: boolean;
  onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
  onAddPort: () => void;
  onRemovePort: (portIndex: number) => void;
  isLoading: boolean;
}

const PortRow: React.FC<PortRowProps> = ({
  port,
  index,
  isLast,
  onPortChange,
  onAddPort,
  onRemovePort,
  isLoading,
}) => (
  <div className="flex flex-wrap items-end gap-2 mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
    <div className="w-1/5">
      <label className={labelSmallStyles}>
        Label
      </label>
      <input
        type="text"
        value={port.label}
        onChange={(e) => onPortChange(index, 'label', e.target.value)}
        placeholder="http"
        className={inputStyles}
        disabled={isLoading}
      />
    </div>

    <div className="w-1/5">
      <label className={labelSmallStyles}>
        Port Type
      </label>
      <select
        value={port.static ? 'true' : 'false'}
        onChange={(e) => onPortChange(index, 'static', e.target.value)}
        className={selectStyles}
        disabled={isLoading}
      >
        <option value="false">Dynamic</option>
        <option value="true">Static</option>
      </select>
    </div>

    <div className="w-1/5">
      <label className={labelSmallStyles}>
        Host Port
      </label>
      {port.static ? (
        <input
          type="number"
          value={port.value}
          onChange={(e) => onPortChange(index, 'value', e.target.value)}
          placeholder="8080"
          min="1"
          max="65535"
          className={inputStyles}
          disabled={isLoading}
        />
      ) : (
        <span className="block p-2 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md h-10">
          Dynamic
        </span>
      )}
    </div>

    <div className="w-1/5">
      <label className={labelSmallStyles}>
        Container Port
      </label>
      <input
        type="number"
        value={port.to}
        onChange={(e) => onPortChange(index, 'to', e.target.value)}
        placeholder="8080"
        min="1"
        max="65535"
        className={inputStyles}
        disabled={isLoading}
      />
    </div>

    <div className="h-10 flex items-center">
      {isLast ? (
        <button
          type="button"
          onClick={onAddPort}
          className="flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 w-16"
          disabled={isLoading}
        >
          <Plus size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRemovePort(index)}
          className="flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 w-16"
          disabled={isLoading}
        >
          <Trash size={16} />
        </button>
      )}
    </div>
  </div>
);

interface PortsSectionProps {
  ports: NomadPort[];
  onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
  onAddPort: () => void;
  onRemovePort: (portIndex: number) => void;
  isLoading: boolean;
}

const PortsSection: React.FC<PortsSectionProps> = ({
  ports,
  onPortChange,
  onAddPort,
  onRemovePort,
  isLoading,
}) => {
  // Default empty port for when there are no ports
  const emptyPort: NomadPort = { label: '', value: 0, to: 8080, static: false };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Ports</h6>
      </div>

      {ports.length === 0 ? (
        <PortRow
          port={emptyPort}
          index={0}
          isLast={true}
          onPortChange={onPortChange}
          onAddPort={onAddPort}
          onRemovePort={onRemovePort}
          isLoading={isLoading}
        />
      ) : (
        ports.map((port, index) => (
          <PortRow
            key={index}
            port={port}
            index={index}
            isLast={index === ports.length - 1}
            onPortChange={onPortChange}
            onAddPort={onAddPort}
            onRemovePort={onRemovePort}
            isLoading={isLoading}
          />
        ))
      )}
    </div>
  );
};

export default PortsSection;
