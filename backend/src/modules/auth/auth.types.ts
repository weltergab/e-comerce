export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface AccessClaims {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AccessClaims;
    }
  }
}
