"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";

import { APP_NAME } from "@/constants";
import { colors, rounded } from "@/theme";

interface AntdAppProviderProps {
  children: ReactNode;
}

const framerTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: colors.accentBlue,
    colorInfo: colors.accentBlue,
    colorSuccess: colors.semanticSuccess,
    colorLink: colors.accentBlue,
    colorBgBase: colors.canvas,
    colorBgContainer: colors.surface1,
    colorBgElevated: colors.surface2,
    colorBgLayout: colors.canvas,
    colorText: colors.ink,
    colorTextSecondary: colors.inkMuted,
    colorTextTertiary: colors.inkMuted,
    colorBorder: colors.hairline,
    colorBorderSecondary: colors.hairlineSoft,
    borderRadius: rounded.md,
    borderRadiusLG: rounded.xl,
    borderRadiusSM: rounded.sm,
    borderRadiusXS: rounded.xs,
    controlHeight: 44,
    fontFamily: "var(--font-body)",
    fontSize: 15,
    lineHeight: 1.3,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: colors.canvas,
      bodyBg: colors.canvas,
      siderBg: colors.canvas,
      headerHeight: 56,
      headerPadding: "0 32px",
    },
    Menu: {
      darkItemBg: colors.canvas,
      darkSubMenuItemBg: colors.canvas,
      darkItemSelectedBg: colors.surface2,
      darkItemHoverBg: colors.surface1,
      itemBorderRadius: rounded.pill,
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      borderRadius: rounded.pill,
      controlHeight: 44,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: rounded.xl,
      paddingLG: 24,
      headerBg: "transparent",
    },
    Input: {
      borderRadius: rounded.md,
      activeShadow: "0 0 0 1px rgba(0, 153, 255, 0.15)",
      paddingBlock: 10,
      paddingInline: 14,
    },
    Modal: {
      borderRadiusLG: rounded.xl,
      contentBg: colors.surface1,
      headerBg: colors.surface1,
    },
    Table: {
      headerBg: colors.surface2,
      rowHoverBg: colors.surface2,
      borderColor: colors.hairlineSoft,
    },
    Tag: {
      borderRadiusSM: rounded.sm,
    },
    Empty: {
      colorTextDescription: colors.inkMuted,
    },
  },
};

export function AntdAppProvider({ children }: AntdAppProviderProps) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={framerTheme}>
        <App message={{ maxCount: 3 }} notification={{ placement: "topRight" }}>
          <div data-app-name={APP_NAME}>{children}</div>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
