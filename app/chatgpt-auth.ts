import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Kept as a compatibility name while the rest of the application migrates.
// Identity now comes from Pep Rally's Clerk account, not the prototype host.
export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const SIGN_IN_PATH = "/sign-in";
const SIGN_OUT_PATH = "/sign-out";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const primaryEmail = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  return {
    userId,
    displayName: fullName ?? primaryEmail,
    email: primaryEmail,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?redirect_url=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname === SIGN_IN_PATH || url.pathname === SIGN_OUT_PATH) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
