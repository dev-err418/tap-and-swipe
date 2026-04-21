import { redirect } from "next/navigation";

export default function DebugCalPage() {
  const url = new URL("https://cal.com/arthur-builds-stuff/app-sprint-application");
  url.searchParams.set("name", "John Doe");
  url.searchParams.set("email", "john@example.com");
  redirect(url.toString());
}
