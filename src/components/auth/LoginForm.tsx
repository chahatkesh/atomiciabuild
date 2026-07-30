"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Space } from "antd";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { APP_NAME, ROUTES } from "@/constants";
import { loginSchema } from "@/modules/auth/client";
import { colors, spacing } from "@/theme";

interface LoginValues {
  email: string;
  password: string;
}

/**
 * The take-home is reviewed by people who did not create these accounts. The
 * credentials are published in the README either way, so putting them one click
 * away costs no secrecy and saves a trip back to the email.
 */
const DEMO_PASSWORD = "Clinic123!";

const DEMO_ACCOUNTS = [
  { label: "Manager", email: "manager@clinicmail.test" },
  { label: "Nurse", email: "anya.haddad@clinicmail.test" },
  { label: "Doctor", email: "marcus.whitfield@clinicmail.test" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<LoginValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackError = searchParams.get("error");

  const submit = async (values: LoginValues) => {
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
  };

  const signInAs = (email: string) => {
    form.setFieldsValue({ email, password: DEMO_PASSWORD });
    void submit({ email, password: DEMO_PASSWORD });
  };

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
            title={error ?? "Invalid credentials. Please try again."}
          />
        )}

        <Form<LoginValues> form={form} layout="vertical" requiredMark={false} onFinish={submit}>
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

      <div
        style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          borderRadius: 12,
          border: `1px dashed ${colors.hairline}`,
        }}
      >
        <p className="type-caption" style={{ margin: `0 0 ${spacing.xs}px` }}>
          Reviewing this take-home? Sign in as
        </p>
        <Space wrap size={8}>
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              size="small"
              disabled={loading}
              onClick={() => signInAs(account.email)}
            >
              {account.label}
            </Button>
          ))}
        </Space>
        <p className="type-caption" style={{ margin: `${spacing.xs}px 0 0`, fontSize: 12 }}>
          Every seeded account uses the password <code>{DEMO_PASSWORD}</code>.
        </p>
      </div>
    </div>
  );
}
