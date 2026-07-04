import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "cat" | "cam" | "admin";
      status: "active" | "pending_role" | "disabled";
    } & DefaultSession["user"];
  }
}
