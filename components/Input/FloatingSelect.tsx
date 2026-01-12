import { Select } from 'antd';
import { useState } from 'react';

export const FloatingSelect = ({ label, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="relative">
      <Select
        {...props}
        className={`
          block w-full text-sm 
          bg-transparent rounded-lg 
          peer
          [&_.ant-select-selector]:px-2.5 
          [&_.ant-select-selector]:pb-2.5 
          [&_.ant-select-selector]:pt-4 
          [&_.ant-select-selector]:border 
          [&_.ant-select-selector]:border-gray-300
          [&_.ant-select-selector]:focus-within:border-blue-500
          [&_.ant-select-selector]:focus-within:ring-2
          [&_.ant-select-selector]:focus-within:ring-blue-500
          [&_.ant-select-selector]:focus-within:outline-none
          [&_.ant-select-selector]:h-auto
          [&_.ant-select-selection-placeholder]:opacity-0
          ${props.className || ''}
          ${props.disabled ? '[&_.ant-select-selector]:bg-gray-50' : ''}
        `}
        placeholder=" "
        onFocus={() => {
          setIsFocused(true);
          props.onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          props.onBlur?.();
        }}
        onChange={(value, option) => {
          setHasValue(!!value && value.length > 0);
          props.onChange?.(value, option);
        }}
        dropdownRender={(menu) => (
          <>
            {menu}
            {/* Thêm custom dropdown items nếu cần */}
          </>
        )}
      />
      <label
        className={`
          absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-1 z-10 
          origin-left bg-white px-2 
          peer-focus-within:px-2 peer-focus-within:text-blue-600
          ${hasValue || isFocused 
            ? 'top-0 scale-75 -translate-y-4 text-blue-600' 
            : 'peer-[&_.ant-select-selection-placeholder]:opacity-100:scale-100 peer-[&_.ant-select-selection-placeholder]:opacity-100:-translate-y-1/2 peer-[&_.ant-select-selection-placeholder]:opacity-100:top-1/2'
          }
          left-1
          cursor-text
          select-none
          ${props.disabled ? 'cursor-not-allowed text-gray-400' : ''}
        `}
      >
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
};

// Sử dụng
{/* <Form.Item
  name="product_name"
  label={null} // Ẩn label mặc định
  rules={[{ required: true }]}
>
  <FloatingSelect
    label="Tên sản phẩm"
    showSearch
    options={PRODUCT_SUGGESTIONS.map((name) => ({
      label: name,
      value: name,
    }))}
    mode="tags"
    maxCount={1}
    disabled={!!orderId}
    className={orderId ? "bg-gray-50" : ""}
    required
  />
</Form.Item> */}