export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};


export const formatVietnameseNumber = (value: number | string) => {
  if (!value && value !== 0) return '';

  const stringValue = value.toString().replace(/\./g, '');
  const numberValue = parseFloat(stringValue);

  if (isNaN(numberValue)) return '';

  return numberValue.toLocaleString('vi-VN');
};