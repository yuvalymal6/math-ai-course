import { cookies } from "next/headers";
import Dashboard from "./page-client";

export default async function HomePage() {
  const cookieStore = await cookies();
  const grade = cookieStore.get("math-grade")?.value || "11";
  const username = cookieStore.get("math-auth")?.value || "";

  return <Dashboard initialGrade={grade} initialUsername={username} />;
}
