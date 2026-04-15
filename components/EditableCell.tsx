'use client';

import { useState, useRef, useEffect } from 'react';
import { isValidLiterInput, parseNumericInput } from '@/lib/helpers';

interface EditableCellProps {
  value: number;
  isEstimated: boolean;
  onSave: (value: number) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableCell({
  value,
  isEstimated,
  onSave,
  placeholder = '0',
  disabled = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError('');
  };

  const handleSave = async () => {
    if (!isValidLiterInput(inputValue)) {
      setError('Invalid value (0-1000)');
      return;
    }

    try {
      setIsSaving(true);
      const newValue = parseNumericInput(inputValue);
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      setError('Save failed');
      console.error('[v0] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(value.toString());
      setError('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleBlur = () => {
    if (isValidLiterInput(inputValue)) {
      handleSave();
    } else {
      setIsEditing(false);
      setInputValue(value.toString());
      setError('');
    }
  };

  if (isEditing) {
    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="1000"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving || disabled}
          placeholder={placeholder}
          className={`w-full px-2 py-1 rounded border-2 text-sm font-medium transition-colors ${
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950'
              : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {error && <span className="text-xs text-red-600 dark:text-red-400 absolute -bottom-5 left-0">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      disabled={disabled}
      className={`w-full px-2 py-1 rounded text-sm font-medium text-left transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${
        isEstimated
          ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200'
          : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200'
      }`}
    >
      <span className="tabular-nums">{value.toFixed(1)}</span>
      {isEstimated && <span className="ml-1 text-xs opacity-70">*</span>}
    </button>
  );
}
