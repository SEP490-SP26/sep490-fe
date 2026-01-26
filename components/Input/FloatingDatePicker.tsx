import { DatePicker, DatePickerProps } from 'antd';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

export interface FloatingDatePickerProps extends DatePickerProps {
    label: string;
    required?: boolean;
}

export const FloatingDatePicker = ({ label, required, className, ...props }: FloatingDatePickerProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    // Sync state with props.value for controlled component behavior
    useEffect(() => {
        if (props.value) {
            setHasValue(true);
        } else {
            setHasValue(false);
        }
    }, [props.value]);

    return (
        <div className="relative">
            <DatePicker
                {...props}
                className={`
          block w-full 
          bg-transparent 
          peer
          pt-4 pb-2
          border-gray-300
          hover:border-blue-500
          focus:border-blue-500
          ${className || ''}
          ${props.disabled ? 'bg-gray-50' : ''}
        `}
                placeholder="" // Hide default placeholder to let label float
                onFocus={(e, info) => {
                    setIsFocused(true);
                    props.onFocus?.(e, info);
                }}
                onBlur={(e, info) => {
                    setIsFocused(false);
                    props.onBlur?.(e, info);
                }}
                onChange={(date, dateString) => {
                    setHasValue(!!date);
                    props.onChange?.(date, dateString);
                }}
            />
            <label
                className={`
          absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-1 z-10 
          origin-left bg-white px-2 
          peer-focus-within:px-2 peer-focus-within:text-blue-600
          ${(hasValue || isFocused)
                        ? 'top-0 scale-75 -translate-y-4 text-blue-600'
                        : 'top-1/2 -translate-y-1/2 scale-100'
                    }
          left-1
          cursor-text
          select-none
          pointer-events-none
          ${props.disabled ? 'cursor-not-allowed text-gray-400' : ''}
        `}
            >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        </div>
    );
};
