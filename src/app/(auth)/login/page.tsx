import { Suspense } from "react";
import { Spin } from "antd";

import { LoginForm } from "@/components/auth";
import { colors, gradients, spacing } from "@/theme";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr",
        background: colors.canvas,
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: spacing.xl,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          className="gradient-spotlight"
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            right: "-8%",
            top: "12%",
            opacity: 0.55,
            filter: "blur(2px)",
            pointerEvents: "none",
            background: gradients.violet,
          }}
        />
        <div
          aria-hidden
          className="gradient-spotlight-orange"
          style={{
            position: "absolute",
            width: 280,
            height: 280,
            left: "-4%",
            bottom: "8%",
            opacity: 0.4,
            borderRadius: 30,
            pointerEvents: "none",
            background: gradients.orange,
          }}
        />
        <div style={{ position: "relative", width: "100%", display: "grid", placeItems: "center" }}>
          <Suspense fallback={<Spin size="large" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
