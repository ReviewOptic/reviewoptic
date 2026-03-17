import { createContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
  accountId: string;
  isAdmin: boolean;
  isImpersonating: boolean;
  planType: "free" | "standard" | "agency";
  planPeriod: "monthly" | "annual";
  requiresPayment: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, companyName: string) => Promise<{ requiresVerification: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
