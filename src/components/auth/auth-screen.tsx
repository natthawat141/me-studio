"use client";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  return (
    <main className="auth-page">
      <header>
        <Link href="/">
          <Brand />
        </Link>
        <Link href="/">กลับสู่สตูดิโอ</Link>
      </header>
      <section className="auth-card">
        <Brand />
        <h1>{register ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</h1>
        <p>จัดการโปรเจกต์และสร้างเรื่องราวของคุณใน me studio</p>
        <form onSubmit={(e) => e.preventDefault()}>
          {register && (
            <label>
              ชื่อที่แสดง
              <input autoComplete="name" placeholder="ชื่อของคุณ" />
            </label>
          )}
          <label>
            อีเมล
            <input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              placeholder="รหัสผ่าน"
            />
          </label>
          <button type="submit" disabled>
            {register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </form>
        <p className="auth-notice">
          กำลังเตรียมระบบบัญชี ฟอร์มนี้ยังไม่ได้เชื่อมต่อ
        </p>
        <div className="auth-switch">
          {register ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Link>
        </div>
      </section>
    </main>
  );
}
