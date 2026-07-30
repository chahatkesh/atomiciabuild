"use client";

import { LeftOutlined, ReloadOutlined, RightOutlined } from "@ant-design/icons";
import { Button, DatePicker, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import styles from "@/components/coverage/coverage.module.css";
import { spacing } from "@/theme";

const DATE_FORMAT = "YYYY-MM-DD";

interface WeekNavigatorProps {
  weekStart: string;
  weekEnd: string;
  isToday: boolean;
  isFetching: boolean;
  onChange: (weekStart: string) => void;
  onToday: () => void;
  onRefresh: () => void;
}

function weekLabel(weekStart: string, weekEnd: string): string {
  const start = dayjs(weekStart);
  const end = dayjs(weekEnd);

  // Drop the repeated month/year: "3 – 9 Aug 2026", not "3 Aug 2026 – 9 Aug 2026".
  if (start.isSame(end, "month")) {
    return `${start.format("D")} – ${end.format("D MMM YYYY")}`;
  }
  if (start.isSame(end, "year")) {
    return `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
  }
  return `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
}

export function WeekNavigator({
  weekStart,
  weekEnd,
  isToday,
  isFetching,
  onChange,
  onToday,
  onRefresh,
}: WeekNavigatorProps) {
  const shiftWeek = (weeks: number) =>
    onChange(dayjs(weekStart).add(weeks, "week").format(DATE_FORMAT));

  return (
    <div className={styles.toolbar}>
      <div>
        <p className="type-caption" style={{ margin: 0 }}>
          Week of
        </p>
        <h2 className="type-headline" style={{ margin: 0 }}>
          {weekLabel(weekStart, weekEnd)}
        </h2>
      </div>

      <div className={styles.toolbarControls}>
        <Button icon={<LeftOutlined />} onClick={() => shiftWeek(-1)} aria-label="Previous week" />
        <Button icon={<RightOutlined />} onClick={() => shiftWeek(1)} aria-label="Next week" />
        <Button onClick={onToday} disabled={isToday}>
          This week
        </Button>

        {/* A day picker rather than antd's week picker: "the week containing this
            date" needs no agreement about which day a week starts on. */}
        <DatePicker
          value={dayjs(weekStart)}
          onChange={(value: Dayjs | null) => {
            if (value) {
              onChange(value.format(DATE_FORMAT));
            }
          }}
          allowClear={false}
          placeholder="Jump to week"
          style={{ minWidth: 150 }}
          aria-label="Jump to the week containing a date"
        />

        <Tooltip title="Refresh now">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={isFetching}
            aria-label="Refresh coverage"
            style={{ marginLeft: spacing.xxs }}
          />
        </Tooltip>
      </div>
    </div>
  );
}
