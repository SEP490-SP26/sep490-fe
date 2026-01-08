"use client";

import { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredRole?: number
) {
  return function WithAuthComponent(props: P) {
    const { isAuthenticated, user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login');
        } else if (requiredRole && user?.role_id !== requiredRole) {
          router.push('/unauthorized');
        }
      }
    }, [isAuthenticated, isLoading, router, user]);

    if (isLoading || !isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (requiredRole && user?.role_id !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-red-500">Bạn không có quyền truy cập trang này</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}