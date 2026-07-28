"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { APP_NAME, ROUTES } from "@/constants";
import { loginSchema } from "@/modules/auth/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackError = searchParams.get("error");

  return (
    <Card style={{ width: "100%", maxWidth: 420 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {APP_NAME}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Sign in with your clinic credentials.
      </Typography.Paragraph>

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
          <Input prefix={<MailOutlined />} placeholder="you@clinicmail.test" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Password is required" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            autoComplete="current-password"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Sign in
        </Button>
      </Form>
    </Card>
  );
}
