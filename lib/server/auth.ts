import { timingSafeEqual } from "node:crypto";
import { adminAuth } from "@/lib/firebase/admin";

const ownerEmail = () => process.env.OWNER_EMAIL || "davenewbergai@gmail.com";

export async function verifyUserRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Missing authorization token");
  const token = header.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.email !== ownerEmail()) throw new Error("Not authorized");
  return decoded;
}

export function verifyAssistantRequest(request: Request) {
  const configured = process.env.COMMAND_CENTER_API_KEY;
  if (!configured) throw new Error("Assistant API is not configured");
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Missing authorization token");
  const supplied = header.slice(7);
  const a = Buffer.from(supplied);
  const b = Buffer.from(configured);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Not authorized");
}

export async function getOwnerUid() {
  const user = await adminAuth.getUserByEmail(ownerEmail());
  return user.uid;
}
