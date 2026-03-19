"use client";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export function useAuth() {
  const router = useRouter();
  function logout() { authService.logout(); router.replace("/admin/login"); }
  return { logout };
}
