import http from "@/lib/httpAxios";
import {
  LoginBodyAlternativeType,
  LoginBodyType,
  LoginResType,
  RegisterResType,
} from "@/schemaValidations/auth.schema";
import axios from "axios";


export type GoogleLoginRes = {
  access_token: string;
  email: string;
  name: string;
  avatar: string;
};

interface RegisterBodyType {
  user_name: string;
  email: string;
  password: string;
  phone_number: string;
  full_name: string;
}

interface UserInfoResponse {
  user_id: number,
  username: string,
  password_hash: string,
  email: string,
  full_name: string,
  role_id: number,
  is_active: boolean,
  phone_number: string,
  created_at: string,
  productions: any[],
  purchases: any[],
  role: any,
  stock_moves: any[],
  assigned_order_requests: any[]
}

const authApiRequest = {
  login: (body: LoginBodyAlternativeType) =>
    http.post<LoginResType>("/login", {
      user_name: body.username || "",
      email: body.email || "",
      password: body.password,
    }),
  register: (otp: string, body: RegisterBodyType) =>
    http.post("/register?otp=" + otp, body),
  loginWithGoogle: (id_token: string) =>
    http.post<GoogleLoginRes>("/login-with-google", {
      id_token,
    }),

  getUserById: (user_id: number) =>
    http.get<UserInfoResponse>(`/get-user-by-id/${user_id}`),
};

export default authApiRequest;
