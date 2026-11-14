import { spawn, type ChildProcess } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
function requestStatus(url: string, method = "GET") {
  return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method,
        agent: false,
        headers:
          method === "POST" ? { "content-type": "application/json" } : undefined,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ statusCode: response.statusCode ?? 0, body });
        });
      }
    );
    request.on("error", reject);
    request.end(method === "POST" ? "{}" : undefined);
  });
}

describe("MCP URL-secret framework routing", () => {
  let nextProcess: ChildProcess | null = null;
  let baseUrl: string;
  let nextOutput = "";

  beforeAll(async () => {
    const portReservation = createServer();

    await new Promise<void>((resolve, reject) => {
      portReservation.once("error", reject);
      portReservation.listen(0, "127.0.0.1", resolve);
    });
    const address = portReservation.address();
    if (!address || typeof address === "string") {
      throw new Error("Next test server did not bind to a TCP port.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;

    await new Promise<void>((resolve, reject) => {
      portReservation.close((error) => (error ? reject(error) : resolve()));
    });

    const childEnv = { ...process.env };
    delete childEnv.__NEXT_TEST_MODE;
    delete childEnv.JEST_WORKER_ID;
    nextProcess = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(address.port),
      ],
      {
        cwd: process.cwd(),
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    nextProcess.on("error", (error) => {
      nextOutput = `${nextOutput}${error.message}`.slice(-8_000);
    });
    nextProcess.stdout?.on("data", (chunk: Buffer) => {
      nextOutput = `${nextOutput}${chunk.toString()}`.slice(-8_000);
    });
    nextProcess.stderr?.on("data", (chunk: Buffer) => {
      nextOutput = `${nextOutput}${chunk.toString()}`.slice(-8_000);
    });

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (nextProcess.exitCode !== null) {
        throw new Error(`Next dev server exited before startup.\n${nextOutput}`);
      }
      try {
        const response = await requestStatus(`${baseUrl}/api/mcp/s`);
        if (response.statusCode === 404) {
          return;
        }
      } catch {
        await delay(200);
      }
    }
    throw new Error(`Next dev server did not start in time.\n${nextOutput}`);
  }, 120_000);

  afterAll(async () => {
    if (
      nextProcess &&
      nextProcess.exitCode === null &&
      nextProcess.signalCode === null
    ) {
      await new Promise<void>((resolve) => {
        const shutdownTimeout = setTimeout(() => {
          nextProcess?.kill("SIGKILL");
          resolve();
        }, 5_000);
        nextProcess?.once("exit", () => {
          clearTimeout(shutdownTimeout);
          resolve();
        });
        nextProcess?.kill("SIGTERM");
      });
    }
  }, 20_000);

  test("returns a framework 404 when the secret segment is missing", async () => {
    const response = await requestStatus(`${baseUrl}/api/mcp/s`, "POST");

    expect(response.statusCode).toBe(404);
    expect(response.statusCode).not.toBe(200);
    expect(response.body).not.toContain("Unauthorized");
  });
});
