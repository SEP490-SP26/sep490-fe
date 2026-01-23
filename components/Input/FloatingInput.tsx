import { Input, Form } from "antd";
import { useState, useEffect } from "react";

// Hàm format số Việt Nam
export const formatVietnameseNumber = (value: number | string) => {
  if (!value && value !== 0) return '';
  const stringValue = value.toString().replace(/\./g, '');
  const numberValue = parseFloat(stringValue);
  if (isNaN(numberValue)) return '';
  return numberValue.toLocaleString('vi-VN');
};

export const FloatingInputAntd = ({
  label,
  valueType = "string", // "string" | "number" | "integer" | "float"
  formatter,  // Hàm format hiển thị
  parser,     // Hàm parse giá trị nhập
  ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>("");
  const [rawValue, setRawValue] = useState<any>(props.value || "");

  // Theo dõi props.value thay đổi
  useEffect(() => {
    if (props.value !== undefined && props.value !== rawValue) {
      setRawValue(props.value);
      updateDisplayValue(props.value);
    }
  }, [props.value]);

  // Hàm format giá trị để hiển thị
  const formatDisplayValue = (value: any): string => {
    if (value === "" || value === null || value === undefined) {
      return "";
    }

    let stringValue = value.toString();

    // Nếu có custom formatter, dùng nó
    if (formatter) {
      return formatter(stringValue);
    }

    // Nếu là số và không có formatter, dùng format mặc định
    if (valueType !== "string") {
      return formatVietnameseNumber(stringValue);
    }

    return stringValue;
  };

  // Hàm parse giá trị từ chuỗi nhập
  const parseInputValue = (value: string): any => {
    if (!value) return null;

    let parsedValue = value;

    // Nếu có custom parser, dùng nó
    if (parser) {
      parsedValue = parser(value);
    } else if (valueType !== "string") {
      // Loại bỏ dấu phân cách
      parsedValue = value.replace(/\./g, '');
    }

    return convertValue(parsedValue);
  };

  // Hàm convert giá trị theo valueType
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

  // Cập nhật giá trị hiển thị
  const updateDisplayValue = (value: any) => {
    const formatted = formatDisplayValue(value);
    setDisplayValue(formatted);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Lưu giá trị thô (chưa format)
    setRawValue(inputValue);

    // Parse giá trị nhập
    const parsedValue = parseInputValue(inputValue);

    // Cập nhật giá trị hiển thị (có format)
    updateDisplayValue(inputValue);

    // Cập nhật trạng thái có giá trị
    setHasValue(!!inputValue);

    // Tạo event mới với giá trị đã convert
    const convertedEvent = {
      ...e,
      target: {
        ...e.target,
        value: parsedValue,
        formattedValue: displayValue,
        originalValue: inputValue,
      },
      currentTarget: {
        ...e.currentTarget,
        value: parsedValue,
      }
    };

    props.onChange?.(convertedEvent);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);

    // Khi focus, hiển thị giá trị thô (không format)
    if (rawValue !== null && rawValue !== undefined) {
      const stringValue = rawValue.toString().replace(/\./g, '');
      setDisplayValue(stringValue);
    }

    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    // Khi blur, format lại giá trị
    if (rawValue !== null && rawValue !== undefined) {
      updateDisplayValue(rawValue);
    }

    props.onBlur?.(e);
  };

  return (
    <div className="relative">
      <Input
        {...props}
        type={valueType === "string" ? "text" : "number"}
        value={displayValue}
        className={`
          block px-2.5 pb-2.5 pt-4 w-full text-sm 
          bg-transparent rounded-base border border-default-medium 
          appearance-none focus:outline-none focus:ring-0 focus:border-brand 
          peer
          ${valueType !== "string" ? "text-end" : ""}
          ${props.className || ""}
        `}
        placeholder=" "
        onFocus={handleFocus}
        onBlur={handleBlur}
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