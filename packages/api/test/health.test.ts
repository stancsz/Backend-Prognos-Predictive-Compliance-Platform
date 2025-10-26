import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    if (res.status !== 200) throw new Error("expected status 200");
    if (!res.body || res.body.status !== "ok") throw new Error("expected body.status === 'ok'");
  });
});
