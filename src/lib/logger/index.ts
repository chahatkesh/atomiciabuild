type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: unknown): void {
  const payload = meta === undefined ? message : `${message} ${JSON.stringify(meta)}`;

  switch (level) {
    case "debug":
      console.debug(payload);
      break;
    case "info":
      console.info(payload);
      break;
    case "warn":
      console.warn(payload);
      break;
    case "error":
      console.error(payload);
      break;
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};
