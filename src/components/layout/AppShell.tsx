"use client";

import {
  CalendarOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

import { APP_NAME, ROUTES } from "@/constants";
import type { UserRole } from "@/types";

const { Header, Sider, Content } = Layout;

interface AppShellProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
}

export function AppShell({ children, role, userName }: AppShellProps) {
  const pathname = usePathname();

  const items = [
    {
      key: ROUTES.dashboard,
      icon: <DashboardOutlined />,
      label: <Link href={ROUTES.dashboard}>Coverage</Link>,
    },
    {
      key: ROUTES.shifts,
      icon: <ScheduleOutlined />,
      label: <Link href={ROUTES.shifts}>Shifts</Link>,
    },
    {
      key: ROUTES.myShifts,
      icon: <CalendarOutlined />,
      label: <Link href={ROUTES.myShifts}>My Shifts</Link>,
    },
    ...(role === "manager"
      ? [
          {
            key: ROUTES.imports,
            icon: <FileSearchOutlined />,
            label: <Link href={ROUTES.imports}>Import Report</Link>,
          },
        ]
      : []),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut({ callbackUrl: ROUTES.login }),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: "16px", color: "#fff" }}>
          <Typography.Title level={5} style={{ color: "#fff", margin: 0 }}>
            {APP_NAME}
          </Typography.Title>
          <Typography.Text style={{ color: "rgba(255,255,255,0.75)" }}>{userName}</Typography.Text>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[pathname]} items={items} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            paddingInline: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {role === "manager" ? "Manager workspace" : "Staff workspace"}
          </Typography.Title>
        </Header>
        <Content style={{ margin: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
