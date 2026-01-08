import z from "zod";
const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

export const RegisterBody = z
  .object({
    // username: z.string().trim().min(2).max(256),
    username: z.string().min(3, "Tài khoản không được dưới 8 kí tự.").max(20, "Tài khoản không dài quá 20 kí tự."),
    email: z.string().email("Không đúng định dạng Email."),
    password: z.string().min(6, "Mật khẩu không được dưới 6 kí tự.").max(30, "Mật khẩu không dài quá 30 kí tự."),
    fullName: z.string().trim().min(2, "Tên không được dưới 2 kí tự.").max(50, "Tên không dài quá 50 kí tự."),
    phoneNumber: z.string().regex(phoneRegex, "Không đúng định dạng số điện thoại").optional(),
    confirmPassword: z.string().min(6).max(100).optional(),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        message: "Mật khẩu không khớp",
        path: ["confirmPassword"],
      });
    }
  });
export const Payment = z.object({
  name: z.string(),
  accountNumber: z.string(),
  expiryAt: z.string(),
});
export const RegisterPartnerBody = z.object({
  partner: RegisterBody,
  payment: Payment,
});
export type RegisterBodyType = z.TypeOf<typeof RegisterBody>;
export type RegisterPartnerBodyType = z.TypeOf<typeof RegisterPartnerBody>;

export const RegisterRes = z.object({
  data: z.object({
    jwt: z.string(),
    refreshToken: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
    avatar: z.string().optional(),
  }),
  message: z.string(),
});

export type RegisterResType = z.TypeOf<typeof RegisterRes>;

export const LoginBody = z.object({
  identifier: z.coerce
    .string()
    .min(1, "Tài khoản hoặc email không được để trống.")
    .max(50, "Tài khoản hoặc email không dài quá 50 kí tự."),
  password: z.coerce
    .string()
    .min(1, "Mật khẩu không được để trống.")
    .max(20, "Mật khẩu không dài quá 20 kí tự."),
}).strict();

// muốn giữ 2 field riêng biệt nhưng không bắt buộc cả hai:
export const LoginBodyAlternative = z.object({
  username: z.string().optional().or(z.literal('')),
  email: z.string().email("Email không đúng định dạng.").optional().or(z.literal('')),
  password: z.string()
    .min(1, "Mật khẩu không được để trống.")
    .max(20, "Mật khẩu không dài quá 20 kí tự."),
}).refine(
  (data) => data.username || data.email,
  {
    message: "Cần nhập username hoặc email",
    path: ["username"],
  }
);



export const LoginRes = RegisterRes;

export type LoginBodyType = z.TypeOf<typeof LoginBody>;
export type LoginBodyAlternativeType = z.TypeOf<typeof LoginBodyAlternative>;

export type LoginResType = z.TypeOf<typeof LoginRes>;
export const SlideSessionBody = z.object({}).strict();

export type SlideSessionBodyType = z.TypeOf<typeof SlideSessionBody>;
export const SlideSessionRes = RegisterRes;

export type SlideSessionResType = z.TypeOf<typeof SlideSessionRes>;
