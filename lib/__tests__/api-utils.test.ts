import { describe, it, expect } from "vitest";
import { ok, bad, unauthorized, notFound } from "@/lib/api-utils";

describe("api-utils", () => {
  it("ok returns 200 with data", async () => {
    const res = ok({ hello: "world" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ hello: "world" });
  });

  it("ok returns custom status", async () => {
    const res = ok({}, 201);
    expect(res.status).toBe(201);
  });

  it("bad returns 400 with error message", async () => {
    const res = bad("Bad request");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Bad request" });
  });

  it("unauthorized returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("notFound returns 404", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
  });
});
