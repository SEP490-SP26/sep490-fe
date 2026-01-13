import http from "@/lib/httpAxios";
import {
  LoginBodyAlternativeType,
  LoginBodyType,
  LoginResType,
  RegisterBodyType,
  RegisterResType,
} from "@/schemaValidations/auth.schema";
import axios from "axios";


export type GoogleLoginRes = {
  access_token: string;
  email: string;
  name: string;
  avatar: string;
};


const authApiRequest = {
  login: (body: LoginBodyAlternativeType) =>
    http.post<LoginResType>("/login", {
      user_name: body.username || "",
      email: body.email || "",
      password: body.password,
    }),
  register: (body: RegisterBodyType) =>
    http.post<RegisterResType>("/api/Login/create-customer", body),
  loginWithGoogle: (id_token: string) =>
    http.post<GoogleLoginRes>("/login-with-google", {
      id_token,
    }),
};

export default authApiRequest;
