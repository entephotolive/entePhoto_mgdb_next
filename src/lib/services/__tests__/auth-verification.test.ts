// @ts-ignore
import { describe, expect, test, mock, spyOn } from "bun:test";
import { getCurrentPhotographerSession } from "@/lib/services/auth.service";
import { UserModel } from "@/models/User";
import * as authUtils from "@/lib/utils/auth";

// Mock next/headers
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "ep-photographer") {
        return { value: "valid-jwt-token" };
      }
      return undefined;
    },
  }),
}));

// Mock next/navigation
mock.module("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock DB connection
mock.module("@/lib/db/mongodb", () => ({
  connectToDatabase: async () => {},
}));

describe("Photographer Session Verification", () => {
  test("returns null when photographer user does not exist in DB despite valid JWT", async () => {
    const mockPayload = {
      sub: "user-123",
      name: "Deleted Photographer",
      email: "deleted@example.com",
    };

    spyOn(authUtils, "verifySessionToken").mockImplementation(async () => mockPayload);
    spyOn(UserModel, "findOne").mockImplementation(async () => null);

    const session = await getCurrentPhotographerSession();
    expect(session).toBeNull();
  });

  test("returns session when active photographer exists in DB", async () => {
    const mockPayload = {
      sub: "user-456",
      name: "Active Photographer",
      email: "active@example.com",
    };

    spyOn(authUtils, "verifySessionToken").mockImplementation(async () => mockPayload);
    spyOn(UserModel, "findOne").mockImplementation(async () => ({
      _id: "user-456",
      email: "active@example.com",
      name: "Active Photographer",
    }) as any);

    const session = await getCurrentPhotographerSession();
    expect(session).not.toBeNull();
    expect(session?.email).toBe("active@example.com");
  });
});
