import React from 'react';
import { inputStyles, inputErrorStyles, checkboxStyles } from '../../../lib/styles';

interface FormInputFieldProps {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'select' | 'checkbox';
  value: string | number | boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  helpText?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  options?: Array<{ value: string; label: string }>;
}

export const FormInputField: React.FC<FormInputFieldProps> = ({
  id,
  name,
  label,
  type,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = '',
  min,
  max,
  className = '',
  helpText,
  isInvalid = false,
  errorMessage,
  options = []
}) => {
  const baseInputClasses = isInvalid ? inputErrorStyles : inputStyles;

  if (type === 'checkbox') {
    return (
      <div className={className}>
        <div className="flex items-center">
          <input
            id={id}
            name={name}
            type="checkbox"
            checked={value as boolean}
            onChange={onChange}
            className={checkboxStyles}
            disabled={disabled}
            required={required}
          />
          <label htmlFor={id} className="ml-2 block text-sm font-medium text-gray-700 dark:text-monokai-text">
            {label}
          </label>
        </div>
        {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">{helpText}</p>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={`mb-4 ${className}`}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
          {label}
        </label>
        <select
          id={id}
          name={name}
          value={value as string}
          onChange={onChange}
          className={baseInputClasses}
          disabled={disabled}
          required={required}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">{helpText}</p>}
        {isInvalid && errorMessage && (
          <p className="mt-1 text-sm text-red-600 dark:text-monokai-red">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value as string | number}
        onChange={onChange}
        placeholder={placeholder}
        className={baseInputClasses}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
      />
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">{helpText}</p>}
      {isInvalid && errorMessage && (
        <p className="mt-1 text-sm text-red-600 dark:text-monokai-red">{errorMessage}</p>
      )}
    </div>
  );
};

export default FormInputField; 