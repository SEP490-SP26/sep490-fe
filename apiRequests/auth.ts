import http from "@/lib/httpAxios";
import {
  LoginBodyAlternativeType,
  LoginBodyType,
  LoginResType,
  RegisterBodyType,
  RegisterResType,
} from "@/schemaValidations/auth.schema";

const authApiRequest = {
  login: (body: LoginBodyAlternativeType) =>
    http.post<LoginResType>("/login", {
      user_name: body.username || "",
      email: body.email || "",
      password: body.password,
    }),
  register: (body: RegisterBodyType) =>
    http.post<RegisterResType>("/api/Login/create-customer", body),
};

export default authApiRequest;
