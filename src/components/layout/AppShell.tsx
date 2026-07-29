"use client";

import {
  CalendarOutlined,
  CloseOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  MenuOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { Button, Drawer } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { APP_NAME, ROUTES } from "@/constants";
import { colors, spacing } from "@/theme";
import type { UserRole } from "@/types";

interface AppShellProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
}

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
}

export function AppShell({ children, role, userName }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: NavItem[] = [
    {
      key: ROUTES.dashboard,
      href: ROUTES.dashboard,
      icon: <DashboardOutlined />,
      label: "Coverage",
    },
    {
      key: ROUTES.shifts,
      href: ROUTES.shifts,
      icon: <ScheduleOutlined />,
      label: "Shifts",
    },
    {
      key: ROUTES.myShifts,
      href: ROUTES.myShifts,
      icon: <CalendarOutlined />,
      label: "My Shifts",
    },
    ...(role === "manager"
      ? [
          {
            key: ROUTES.imports,
            href: ROUTES.imports,
            icon: <FileSearchOutlined />,
            label: "Import Report",
          },
        ]
      : []),
  ];

  const linkStyle = (active: boolean): CSSProperties => ({
    color: active ? colors.ink : colors.inkMuted,
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: "-0.14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 100,
    background: active ? colors.surface2 : "transparent",
    textDecoration: "none",
  });

  const navLinks = items.map((item) => (
    <Link
      key={item.key}
      href={item.href}
      style={linkStyle(pathname === item.key)}
      onClick={() => setMobileOpen(false)}
    >
      {item.icon}
      {item.label}
    </Link>
  ));

  const pageTitle = items.find((item) => item.key === pathname)?.label ?? "Workspace";

  return (
    <div style={{ minHeight: "100vh", background: colors.canvas, color: colors.ink }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: spacing.xl,
          background: colors.canvas,
          borderBottom: `1px solid ${colors.hairlineSoft}`,
          gap: spacing.md,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, minWidth: 0 }}>
          <Button
            type="text"
            className="app-nav-menu-btn"
            aria-label="Open menu"
            icon={<MenuOutlined style={{ color: colors.ink }} />}
            onClick={() => setMobileOpen(true)}
            style={{ display: "none", color: colors.ink }}
          />
          <Link href={ROUTES.dashboard} style={{ textDecoration: "none", color: colors.ink }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "-0.15px",
                whiteSpace: "nowrap",
              }}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>

        <nav
          className="app-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {navLinks}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <span
            className="type-caption"
            style={{
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userName}
          </span>
          <Button type="default" onClick={() => signOut({ callbackUrl: ROUTES.login })}>
            Sign out
          </Button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1199,
          margin: "0 auto",
          padding: `${spacing.xl}px ${spacing.xl}px ${spacing.section}px`,
        }}
      >
        <div style={{ marginBottom: spacing.xl }}>
          <p className="type-caption" style={{ margin: `0 0 ${spacing.xs}px` }}>
            {role === "manager" ? "Manager workspace" : "Staff workspace"}
          </p>
          <h1 className="type-display-md" style={{ margin: 0, color: colors.ink }}>
            {pageTitle}
          </h1>
        </div>
        {children}
      </main>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        placement="left"
        size={280}
        styles={{
          body: { background: colors.canvas, padding: spacing.lg },
          header: {
            background: colors.canvas,
            borderBottom: `1px solid ${colors.hairlineSoft}`,
          },
        }}
        title={
          <span style={{ color: colors.ink, fontFamily: "var(--font-display)" }}>{APP_NAME}</span>
        }
        closeIcon={<CloseOutlined style={{ color: colors.ink }} />}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="type-caption" style={{ marginBottom: spacing.sm }}>
            {userName}
          </span>
          {navLinks}
        </div>
      </Drawer>
    </div>
  );
}
