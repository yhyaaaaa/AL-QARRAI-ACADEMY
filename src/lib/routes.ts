import type { AccountType } from "@/types";

/** Landing route after sign-in for each account type. */
export function homeFor(type: AccountType | undefined): string {
  return type === "parent" ? "/parent" : "/dashboard";
}
