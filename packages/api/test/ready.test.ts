import request from "supertest";
import { createApp } from "../src/app";

describe("GET /ready", () => {
  it("returns 200 and readiness object", async () => {
    const app = createApp();
    const res = await request(app).get("/ready");
    if (res.status !== 200) throw new Error("expected status 200");
    if (typeof res.body.ready !== "boolean") throw new Error("expected body.ready to be boolean");
    if (!("db" in res.body) || !("s3" in res.body) || !("bucket" in res.body)) {
      throw new Error("expected body to include db, s3, and bucket keys");
    }
  });
});
