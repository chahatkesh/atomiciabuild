"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";

import { APP_NAME } from "@/constants";

interface AntdAppProviderProps {
  children: ReactNode;
}

const clinicTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 8,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      bodyBg: "#f5f7fb",
      siderBg: "#001529",
    },
  },
};

export function AntdAppProvider({ children }: AntdAppProviderProps) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={clinicTheme}>
        <App message={{ maxCount: 3 }} notification={{ placement: "topRight" }}>
          <div data-app-name={APP_NAME}>{children}</div>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
