import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // For demo purposes, let's create a simple authentication
        // In production, you would validate against your database
        const validUsers = [
          {
            id: "1",
            email: "admin@biascertify.com",
            password: "admin123",
            name: "Admin User",
            role: "admin"
          },
          {
            id: "2", 
            email: "user@biascertify.com",
            password: "user123",
            name: "Demo User",
            role: "user"
          }
        ];

        const user = validUsers.find(
          (user) => user.email === credentials.email && user.password === credentials.password
        );

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-for-development",
}; 