"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// Address interface
export interface ShippingAddress {
  id: string;
  label: string; // "Nhà riêng", "Công ty", etc.
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  streetAddress: string;
  isDefault: boolean;
  // Map coordinates (optional for backward compatibility)
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  createdAt: string;
  addresses?: ShippingAddress[];
}

interface CustomerContextType {
  customer: Customer | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (customer: Customer) => void;
  logout: () => void;
  updateProfile: (data: Partial<Customer>) => void;
  register: (data: Omit<Customer, "id" | "createdAt">) => Customer;
  // Address management
  addAddress: (address: Omit<ShippingAddress, "id">) => void;
  updateAddress: (addressId: string, data: Partial<ShippingAddress>) => void;
  deleteAddress: (addressId: string) => void;
  setDefaultAddress: (addressId: string) => void;
  getDefaultAddress: () => ShippingAddress | undefined;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

// Mock customer database (stored in localStorage)
const STORAGE_KEY = "sep490_customer";
const CUSTOMERS_DB_KEY = "sep490_customers_db";

// Sample customers for testing (pre-populated)
const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: "CUST-DEMO-001",
    phone: "0123456789",
    name: "Khách Hàng Demo",
    email: "demo@example.com",
    createdAt: "2024-01-01T00:00:00.000Z",
    addresses: [
      {
        id: "ADDR-001",
        label: "Nhà riêng",
        provinceCode: "HCM",
        provinceName: "TP. Hồ Chí Minh",
        districtCode: "HCM-001",
        districtName: "Quận 1",
        streetAddress: "123 Nguyễn Huệ, Phường Bến Nghé",
        isDefault: true,
      },
      {
        id: "ADDR-002",
        label: "Công ty",
        provinceCode: "HCM",
        provinceName: "TP. Hồ Chí Minh",
        districtCode: "HCM-011",
        districtName: "Quận Bình Thạnh",
        streetAddress: "456 Điện Biên Phủ, Phường 25",
        isDefault: false,
      },
    ],
  },
  {
    id: "CUST-DEMO-002",
    phone: "0987654321",
    name: "Nguyễn Văn Test",
    email: "test@example.com",
    createdAt: "2024-06-15T00:00:00.000Z",
    addresses: [
      {
        id: "ADDR-003",
        label: "Văn phòng",
        provinceCode: "HN",
        provinceName: "Hà Nội",
        districtCode: "HN-005",
        districtName: "Quận Cầu Giấy",
        streetAddress: "789 Xuân Thủy, Phường Dịch Vọng Hậu",
        isDefault: true,
      },
    ],
  },
  {
    id: "CUST-DEMO-003",
    phone: "0912345678",
    name: "Trần Thị Mẫu",
    email: "mau@example.com",
    createdAt: "2024-12-01T00:00:00.000Z",
    addresses: [],
  },
];

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer from localStorage on mount
  useEffect(() => {
    initializeSampleCustomers();

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomer(parsed);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Initialize sample customers in localStorage
  const initializeSampleCustomers = () => {
    const existing = localStorage.getItem(CUSTOMERS_DB_KEY);
    if (!existing) {
      localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(SAMPLE_CUSTOMERS));
    } else {
      try {
        const db: Customer[] = JSON.parse(existing);
        let updated = false;
        SAMPLE_CUSTOMERS.forEach((sample) => {
          if (!db.find((c) => c.phone === sample.phone)) {
            db.push(sample);
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(db));
        }
      } catch {
        localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(SAMPLE_CUSTOMERS));
      }
    }
  };

  const getCustomersDB = (): Customer[] => {
    try {
      const stored = localStorage.getItem(CUSTOMERS_DB_KEY);
      return stored ? JSON.parse(stored) : SAMPLE_CUSTOMERS;
    } catch {
      return SAMPLE_CUSTOMERS;
    }
  };

  const saveCustomersDB = (customers: Customer[]) => {
    localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(customers));
  };

  const login = (customerData: Customer) => {
    setCustomer(customerData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateProfile = (data: Partial<Customer>) => {
    if (!customer) return;

    const updatedCustomer = { ...customer, ...data };
    setCustomer(updatedCustomer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomer));

    const db = getCustomersDB();
    const index = db.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      db[index] = updatedCustomer;
      saveCustomersDB(db);
    }
  };

  const register = (data: Omit<Customer, "id" | "createdAt">): Customer => {
    const newCustomer: Customer = {
      ...data,
      id: `CUST-${Date.now()}`,
      createdAt: new Date().toISOString(),
      addresses: [],
    };

    const db = getCustomersDB();
    db.push(newCustomer);
    saveCustomersDB(db);
    login(newCustomer);

    return newCustomer;
  };

  // --- ADDRESS MANAGEMENT ---
  const addAddress = (address: Omit<ShippingAddress, "id">) => {
    if (!customer) return;

    const newAddress: ShippingAddress = {
      ...address,
      id: `ADDR-${Date.now()}`,
    };

    // If this is the first address or marked as default, set as default
    const currentAddresses = customer.addresses || [];
    if (currentAddresses.length === 0 || address.isDefault) {
      // Remove default from other addresses
      currentAddresses.forEach((a) => (a.isDefault = false));
      newAddress.isDefault = true;
    }

    const updatedAddresses = [...currentAddresses, newAddress];
    updateProfile({ addresses: updatedAddresses });
  };

  const updateAddress = (addressId: string, data: Partial<ShippingAddress>) => {
    if (!customer) return;

    const addresses = customer.addresses || [];
    const index = addresses.findIndex((a) => a.id === addressId);
    if (index < 0) return;

    // If setting as default, remove default from others
    if (data.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses[index] = { ...addresses[index], ...data };
    updateProfile({ addresses });
  };

  const deleteAddress = (addressId: string) => {
    if (!customer) return;

    const addresses = customer.addresses || [];
    const filtered = addresses.filter((a) => a.id !== addressId);

    // If deleted address was default, set first one as default
    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0].isDefault = true;
    }

    updateProfile({ addresses: filtered });
  };

  const setDefaultAddress = (addressId: string) => {
    if (!customer) return;

    const addresses = customer.addresses || [];
    addresses.forEach((a) => {
      a.isDefault = a.id === addressId;
    });

    updateProfile({ addresses });
  };

  const getDefaultAddress = (): ShippingAddress | undefined => {
    if (!customer?.addresses) return undefined;
    return customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoggedIn: !!customer,
        isLoading,
        login,
        logout,
        updateProfile,
        register,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        getDefaultAddress,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}

// Helper function to find customer by phone (exported for login page)
export function findCustomerByPhone(phone: string): Customer | undefined {
  try {
    const stored = localStorage.getItem(CUSTOMERS_DB_KEY);
    const db: Customer[] = stored ? JSON.parse(stored) : [];
    return db.find((c) => c.phone === phone);
  } catch {
    return undefined;
  }
}

// Helper function to find customer by email (exported for registration page)
export function findCustomerByEmail(email: string): Customer | undefined {
  try {
    const stored = localStorage.getItem(CUSTOMERS_DB_KEY);
    const db: Customer[] = stored ? JSON.parse(stored) : [];
    return db.find((c) => c.email === email);
  } catch {
    return undefined;
  }
}
