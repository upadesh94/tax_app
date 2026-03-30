export type AuthStore = {
  userId: string | null;
  isAuthenticated: boolean;
};

export const initialAuthStore: AuthStore = {
  userId: null,
  isAuthenticated: false,
};
