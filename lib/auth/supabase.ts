import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type UserRole = "admin" | "member";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !data) return null;
  return data as PublicUser;
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PublicUser;
}

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string } | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.user || !data.session) {
    return null;
  }

  const user = await getUserById(data.user.id);
  if (!user) return null;

  return {
    user,
    token: data.session.access_token,
  };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return getUserById(data.user.id);
}
