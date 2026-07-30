import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Clinic Shift Scheduler — week-at-a-glance coverage for clinic staff shifts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#ffffff";
const INK_MUTED = "#999999";
const CANVAS = "#090909";
const SURFACE_1 = "#141414";
const SURFACE_2 = "#1c1c1c";
const HAIRLINE = "#262626";
const SUCCESS = "#22c55e";
const WARNING = "#f5a623";
const DANGER = "#ef4444";

const GEIST_DIR = "node_modules/geist/dist/fonts/geist-sans";

/**
 * Satori needs font bytes, and the app's display face already ships with the
 * `geist` package. Falling back to the built-in face keeps the build green if
 * the file ever moves rather than failing the whole route.
 */
async function loadGeist(file: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), GEIST_DIR, file));
  } catch {
    return null;
  }
}

interface PreviewCard {
  window: string;
  count: string;
  edge: string;
  chips: Array<{ label: string; tone: "missing" | "covered" }>;
}

/** A fragment of the real coverage grid — the clearest one-glance summary. */
const PREVIEW: PreviewCard[] = [
  {
    window: "07:00 – 15:00",
    count: "3/3",
    edge: SUCCESS,
    chips: [{ label: "Covered", tone: "covered" }],
  },
  {
    window: "15:00 – 23:00",
    count: "1/3",
    edge: WARNING,
    chips: [{ label: "2 N", tone: "missing" }],
  },
  {
    window: "23:00 – 07:00",
    count: "0/2",
    edge: DANGER,
    chips: [
      { label: "1 D", tone: "missing" },
      { label: "1 N", tone: "missing" },
    ],
  },
];

function Chip({ label, tone }: { label: string; tone: "missing" | "covered" }) {
  const covered = tone === "covered";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "3px 12px",
        marginRight: 8,
        borderRadius: 100,
        fontSize: 19,
        fontWeight: 500,
        background: covered ? "rgba(34, 197, 94, 0.14)" : "rgba(245, 166, 35, 0.16)",
        color: covered ? "#6ee7a0" : "#f8c877",
      }}
    >
      {label}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginRight: 34 }}>
      <div
        style={{
          width: 12,
          height: 12,
          marginRight: 10,
          borderRadius: 999,
          background: color,
        }}
      />
      <div style={{ fontSize: 22, color: INK_MUTED }}>{label}</div>
    </div>
  );
}

export default async function OpengraphImage() {
  const [medium, regular] = await Promise.all([
    loadGeist("Geist-Medium.ttf"),
    loadGeist("Geist-Regular.ttf"),
  ]);

  const fonts = [
    medium ? { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const } : null,
    regular
      ? { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const }
      : null,
  ].filter((font) => font !== null);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: CANVAS,
        color: INK,
        fontFamily: fonts.length > 0 ? "Geist" : undefined,
        letterSpacing: "-0.02em",
      }}
    >
      {/* A single cool highlight keeps the canvas from reading as flat black. */}
      <div
        style={{
          position: "absolute",
          top: -280,
          right: -180,
          width: 760,
          height: 760,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(0,153,255,0.16) 0%, rgba(9,9,9,0) 70%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 14,
            height: 14,
            marginRight: 14,
            borderRadius: 999,
            background: INK,
          }}
        />
        <div style={{ fontSize: 26, fontWeight: 500 }}>Clinic Shift Scheduler</div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 610 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 500,
              lineHeight: 1.02,
              letterSpacing: "-0.045em",
            }}
          >
            Week-at-a-glance shift coverage.
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 27,
              lineHeight: 1.35,
              color: INK_MUTED,
            }}
          >
            Managers schedule and assign. Staff claim what fits. Capacity and overlap are enforced
            on the server, under load.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 56 }}>
          {PREVIEW.map((card) => (
            <div
              key={card.window}
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 14,
                padding: "16px 18px",
                borderRadius: 12,
                border: `1px solid ${HAIRLINE}`,
                borderLeft: `5px solid ${card.edge}`,
                background: SURFACE_2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 23,
                  fontWeight: 500,
                }}
              >
                <div style={{ display: "flex" }}>{card.window}</div>
                <div style={{ display: "flex", color: INK_MUTED }}>{card.count}</div>
              </div>
              <div style={{ display: "flex", marginTop: 12 }}>
                {card.chips.map((chip) => (
                  <Chip key={chip.label} label={chip.label} tone={chip.tone} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 28,
          borderTop: `1px solid ${SURFACE_1}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <LegendItem color={SUCCESS} label="Fully staffed" />
          <LegendItem color={WARNING} label="Partially staffed" />
          <LegendItem color={DANGER} label="Empty" />
        </div>
        <div style={{ fontSize: 22, color: INK_MUTED }}>atomiciabuild.vercel.app</div>
      </div>
    </div>,
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
