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

const authApiRequest = {
  login: (body: LoginBodyAlternativeType) =>
    http.post<LoginResType>("/login", {
      user_name: body.username || "",
      email: body.email || "",
      password: body.password,
    }),
  register: (otp: string, body: RegisterBodyType) =>
    http.post("/api/register", body, {
      headers: {
        "otp": otp,
      },
    }),
  loginWithGoogle: (id_token: string) =>
    http.post<GoogleLoginRes>("/login-with-google", {
      id_token,
    }),
};

export default authApiRequest;
