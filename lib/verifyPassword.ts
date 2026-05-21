import authApiRequest from "@/apiRequests/auth";

/**
 * Xác minh mật khẩu hiện tại bằng cách gọi login với tài khoản đang đăng nhập.
 * Không thay đổi token trong localStorage.
 */
export async function verifyCurrentPassword(password: string): Promise<void> {
  const raw = localStorage.getItem("user");
  if (!raw) {
    throw new Error("Phiên đăng nhập không hợp lệ");
  }

  const { user_id } = JSON.parse(raw) as { user_id?: number };
  if (!user_id) {
    throw new Error("Không tìm thấy thông tin người dùng");
  }

  const profile = await authApiRequest.getUserById(user_id);
  const username = profile.username?.trim();
  const email = profile.email?.trim();

  if (!username && !email) {
    throw new Error("Không xác định được tài khoản đăng nhập");
  }

  await authApiRequest.login({
    username: username || "string",
    email: email || "string",
    password,
  });
}
