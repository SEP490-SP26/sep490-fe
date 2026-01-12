// app/Providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { CustomerProvider } from "@/context/CustomerContext";
import { ProductionProvider } from "@/context/ProductionContext";
import { ToastContainer } from "react-toastify";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Sử dụng useState để đảm bảo QueryClient chỉ được tạo một lần
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AntdRegistry>
        <ProductionProvider>
            <AuthProvider>
          <CustomerProvider>
            {children}
            <ToastContainer />
          </CustomerProvider>
          </AuthProvider>
        </ProductionProvider>
      </AntdRegistry>
    </QueryClientProvider>
  );
}