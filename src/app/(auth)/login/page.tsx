import { Suspense } from "react";
import { Spin } from "antd";

import { LoginForm } from "@/components/auth";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Suspense fallback={<Spin size="large" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
