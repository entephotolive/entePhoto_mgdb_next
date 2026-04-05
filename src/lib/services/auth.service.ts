import { cookies } from "next/headers";
import {
  comparePassword,
  getAuthCookieOptions,
  hashPassword,
  signSessionToken,
  verifySessionToken,
} from "@/lib/utils/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { SessionUser } from "@/types";

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function mapSessionUser(user: { _id: string; name: string; email: string }): SessionUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

export async function registerUser(input: RegisterUserInput) {
  await connectToDatabase();

  const existingUser = await UserModel.findOne({ email: input.email.toLowerCase() });

  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await UserModel.create({
    ...input,
    email: input.email.toLowerCase(),
    password: hashedPassword,
  });

  return mapSessionUser(user);
}

export async function loginUser(input: LoginInput) {
  await connectToDatabase();

  const user = await UserModel.findOne({ email: input.email.toLowerCase() });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (!user.password) {
    throw new Error("This account uses Google Sign-In. Please sign in with Google.");
  }

  const isValidPassword = await comparePassword(input.password, user.password);

  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  return mapSessionUser(user);
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const token = await signSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
  });

  cookieStore.set({
    ...getAuthCookieOptions(),
    value: token,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(getAuthCookieOptions().name);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieOptions().name)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
