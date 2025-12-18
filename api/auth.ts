import http from "@/src/lib/httpAxios";
import {
  LoginBodyType,
  LoginResType,
  RegisterBodyType,
  RegisterResType,
} from "@/src/schemaValidations/auth.schema";
import { MessageResType } from "@/src/schemaValidations/common.schema";

const authApiRequest = {
  login: (body: LoginBodyType) =>
    http.post<LoginResType>("/api/Login/login", body),
  register: (body: RegisterBodyType) =>
    http.post<RegisterResType>("/api/Login/create-customer", body),
  auth: (body: {  sessionToken: string; sessionRole: string; expiresAt: string;  }) =>
    http.post("/api/auth", body, {
      baseUrl: "",
    }),
  me: () => http.get("/api/me", { baseUrl: "" }),
  logoutFromNextClientToNextServer: (
    force?: boolean | undefined,
    signal?: AbortSignal | undefined
  ) =>
    http.post<MessageResType>(
      "/api/auth/logout",
      {
        force,
      },
      {
        baseUrl: "",
        signal,
      }
    ),
  upload: (body: any) => http.post("/api/upload/image", body),
  // logoutFromNextServerToServer: (sessionToken: string) => //Không dùng vì be ko có đăng xuất
  //   http.post<MessageResType>(
  //     '/auth/logout',
  //     {},
  //     {
  //       headers: {
  //         Authorization: `Bearer ${sessionToken}`
  //       }
  //     }
  //   ),
  // slideSessionFromNextServerToServer: (sessionToken: string) => //Không dùng vì be ko có chức năng kéo dài jwt
  //   http.post<SlideSessionResType>(
  //     '/auth/slide-session',
  //     {},
  //     {
  //       headers: {
  //         Authorization: `Bearer ${sessionToken}`
  //       }
  //     }
  //   ),
  // slideSessionFromNextClientToNextServer: () => //Không dùng vì be ko có chức năng kéo dài jwt
  //   http.post<SlideSessionResType>(
  //     '/api/auth/slide-session',
  //     {},
  //     { baseUrl: '' }
  //   )
};

export default authApiRequest;
