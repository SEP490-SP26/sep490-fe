import React, { useState, ChangeEvent } from 'react';

interface SimpleInputNumberProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SimpleInputNumber: React.FC<SimpleInputNumberProps> = ({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState<string>(
    value !== undefined ? value.toString() : ''
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Chỉ cho phép số, dấu chấm thập phân và dấu trừ
    if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
      setInputValue(newValue);
      
      if (onChange) {
        if (newValue === '' || newValue === '-' || newValue === '.') {
          onChange(0);
        } else {
          const numericValue = parseFloat(newValue);
          onChange(numericValue);
        }
      }
    }
  };

  const handleBlur = () => {
    // Format lại giá trị khi blur
    if (inputValue === '' || inputValue === '-' || inputValue === '.') {
      setInputValue('0');
      if (onChange) onChange(0);
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md
        text-right font-mono text-gray-900
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        placeholder:text-gray-400 placeholder:text-left
        ${className}
      `}
      inputMode="decimal"
    />
  );
};

export default SimpleInputNumber;