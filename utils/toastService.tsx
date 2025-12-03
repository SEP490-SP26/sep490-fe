import { toast } from "react-toastify";

/**
 * Hàm hiển thị thông báo thành công
 * @param {string} message - Nội dung thông báo
 */
export const showSuccessToast = (message: string) => {
  toast.success(message, {
    position: "bottom-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
  });
};

/**
 * Hàm hiển thị thông báo lỗi
 * @param {string} message - Nội dung thông báo
 */
export const showErrorToast = (message: string) => {
  toast.error(message, {
    position: "bottom-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
  });
};

/**
 * Hàm hiển thị thông báo cảnh báo
 * @param {string} message - Nội dung thông báo
 */
export const showWarningToast = (message: string) => {
  toast.error(message, {
    position: "bottom-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
  });
};

/**
 * Hàm hiển thị thông báo information
 * @param {string} message - Nội dung thông báo
 */
export const showInfoToast = (message: string) => {
  toast.info(message, {
    position: "bottom-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
  });
};
