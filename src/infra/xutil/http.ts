import https from "node:https";
import { URL } from "node:url";
import { env } from "@/env";

export const REQUEST_TIMEOUT_MS = 60_000;

type HttpResult = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function networkHint(code?: string): string {
  if (code === "ERR_SSL_WRONG_VERSION_NUMBER") {
    return " (disable VPN to reach ticket.xutil.net)";
  }
  if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY") {
    return " (set XUTIL_TLS_INSECURE=true in .env if the browser works without VPN)";
  }
  return "";
}

export async function xutilFetch(url: string, options: RequestInit = {}): Promise<HttpResult> {
  const parsed = new URL(url);
  const method = options.method ?? "GET";
  const body =
    typeof options.body === "string"
      ? options.body
      : options.body
        ? String(options.body)
        : undefined;

  const headers: Record<string, string> = {};
  if (options.headers) {
    const h = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    h.forEach((value: string, key: string) => {
      headers[key] = value;
    });
  }
  if (body && !headers["content-length"] && !headers["Content-Length"]) {
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        servername: parsed.hostname,
        rejectUnauthorized: !env.XUTIL_TLS_INSECURE,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => text,
          });
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("[xutil] request timeout"));
    });

    req.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      reject(new Error(`[xutil] fetch failed: ${err.message}${networkHint(code)}`));
    });

    if (body) req.write(body);
    req.end();
  });
}
