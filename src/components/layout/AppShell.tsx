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

interface PageHeader {
  title: string;
  subtitle: string;
}

/**
 * One heading per page, owned by the shell so the nav label and the visible
 * title can never disagree. Copy is role-aware because the same routes mean
 * different things to a manager and to someone looking for a shift.
 */
function pageHeaderFor(pathname: string, role: UserRole, firstName: string): PageHeader {
  const isManager = role === "manager";

  switch (pathname) {
    case ROUTES.dashboard:
      return isManager
        ? {
            title: `Coverage, ${firstName}`,
            subtitle: "Every shift this week, its staffing status, and which roles are missing.",
          }
        : {
            title: `Where you're needed, ${firstName}`,
            subtitle: "Shifts still short-staffed this week. Claim one from the Shifts page.",
          };
    case ROUTES.shifts:
      return isManager
        ? {
            title: "Shifts",
            subtitle: "Create, edit, and assign. Every claim is checked before it sticks.",
          }
        : {
            title: "Shifts",
            subtitle:
              "Claim anything that still needs your profession and does not clash with a shift you already have.",
          };
    case ROUTES.myShifts:
      return {
        title: "My Shifts",
        subtitle: "Everything you have claimed. Leaving one puts the slot back for someone else.",
      };
    case ROUTES.imports:
      return {
        title: "Import Report",
        subtitle:
          "Upload a clinic spreadsheet, or review what the importer accepted, repaired, merged, and rejected.",
      };
    default:
      return { title: "Workspace", subtitle: "" };
  }
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

  const navLinks = items.map((item) => {
    const active = pathname === item.key;

    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        style={linkStyle(active)}
        onClick={() => setMobileOpen(false)}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  });

  const header = pageHeaderFor(pathname, role, userName.split(" ")[0]);
  const signOutButton = (
    <Button type="default" onClick={() => signOut({ callbackUrl: ROUTES.login })}>
      Sign out
    </Button>
  );

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
          aria-label="Primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {navLinks}
        </nav>

        {/* Below 810px the identity block moves into the drawer — a 375px header
            cannot hold a name and a 44px pill without crowding the app name. */}
        <div className="app-header-account" style={{ alignItems: "center", gap: spacing.sm }}>
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
          {signOutButton}
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
            {header.title}
          </h1>
          {header.subtitle ? (
            <p className="type-body-lg" style={{ margin: `${spacing.xs}px 0 0`, maxWidth: "68ch" }}>
              {header.subtitle}
            </p>
          ) : null}
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
          <nav aria-label="Primary" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {navLinks}
          </nav>
          <div
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.hairlineSoft}`,
            }}
          >
            {signOutButton}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
