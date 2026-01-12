import { Input, Form } from "antd";
import { useState } from "react";

export const FloatingInputAntd = ({ 
  label, 
  valueType = "string", // "string" | "number" | "integer" | "float"
  ...props 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const convertValue = (value: string): any => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    
    switch (valueType) {
      case "number":
        const num = Number(value);
        return isNaN(num) ? value : num;
        
      case "integer":
        const int = parseInt(value, 10);
        return isNaN(int) ? value : int;
        
      case "float":
        const float = parseFloat(value);
        return isNaN(float) ? value : float;
        
      case "string":
      default:
        return value;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHasValue(!!value);
    
    // Tạo event mới với giá trị đã convert
    const convertedValue = convertValue(value);
    const convertedEvent = {
      ...e,
      target: {
        ...e.target,
        value: convertedValue,
        originalValue: value, // Giữ giá trị gốc nếu cần
      },
      currentTarget: {
        ...e.currentTarget,
        value: convertedValue,
      }
    };
    
    props.onChange?.(convertedEvent);
  };

  return (
    <div className="relative">
      <Input
        {...props}
        type={valueType === "string" ? "text" : "number"}
        className={`
          block px-2.5 pb-2.5 pt-4 w-full text-sm 
          bg-transparent rounded-base border border-default-medium 
          appearance-none focus:outline-none focus:ring-0 focus:border-brand 
          peer
          ${valueType !== "string" ? "text-end" : ""}
          ${props.className || ""}
        `}
        placeholder=" "
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        onChange={handleChange}
      />
      <label
        className={`
          absolute text-sm text-body duration-300 transform -translate-y-4 scale-75 top-1 z-10 
          origin-left  px-2 
          peer-focus:px-2 peer-focus:text-fg-brand 
          peer-placeholder-shown:scale-100 
          peer-placeholder-shown:-translate-y-1/2 
          peer-placeholder-shown:top-1/2 
          peer-focus:top-1 
          peer-focus:scale-75 
          peer-focus:-translate-y-4 
          start-1
          cursor-text
          select-none
          bg-gray-50
          pointer-events-none
          ${hasValue || isFocused ? "top-1 scale-75 -translate-y-1" : ""}
          ${props.disabled ? "cursor-not-allowed bg-gray-50 rounded-t-sm" : ""}
        `}
      >
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
};