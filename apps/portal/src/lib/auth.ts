import NextAuth from "next-auth";
import { authConfig } from "@kindergarten/auth";

// Create auth handlers for portal app using shared config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(authConfig) as any;

export const handlers = nextAuth.handlers;
export const auth: () => Promise<{ user?: { id?: string; email?: string | null; role?: string; firstName?: string; lastName?: string } } | null> = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
