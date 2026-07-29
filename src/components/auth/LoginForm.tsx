"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input } from "antd";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { APP_NAME, ROUTES } from "@/constants";
import { loginSchema } from "@/modules/auth/client";
import { colors, spacing } from "@/theme";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackError = searchParams.get("error");

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div style={{ marginBottom: spacing.xl }}>
        <p className="type-caption" style={{ margin: `0 0 ${spacing.sm}px` }}>
          Clinic operations
        </p>
        <h1
          className="type-display-md"
          style={{ margin: `0 0 ${spacing.md}px`, color: colors.ink }}
        >
          {APP_NAME}
        </h1>
        <p className="type-body-lg" style={{ margin: 0 }}>
          Sign in with your clinic credentials.
        </p>
      </div>

      <div className="surface-card" style={{ boxShadow: "var(--elevation-light-edge)" }}>
        {(error || callbackError) && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error ?? "Invalid credentials. Please try again."}
          />
        )}

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async (values) => {
            setError(null);
            const parsed = loginSchema.safeParse(values);
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Invalid input");
              return;
            }

            setLoading(true);
            const result = await signIn("credentials", {
              email: parsed.data.email,
              password: parsed.data.password,
              redirect: false,
            });
            setLoading(false);

            if (result?.error) {
              setError("Invalid email or password.");
              return;
            }

            router.push(ROUTES.dashboard);
            router.refresh();
          }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: colors.inkMuted }} />}
              placeholder="you@clinicmail.test"
              autoComplete="email"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: colors.inkMuted }} />}
              placeholder="Password"
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Sign in
          </Button>
        </Form>
      </div>

      <p className="type-caption" style={{ marginTop: spacing.lg, textAlign: "center" }}>
        Managers and staff use the same portal — role is resolved from your account.
      </p>
    </div>
  );
}
