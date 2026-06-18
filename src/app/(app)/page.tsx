import { redirect } from "next/navigation";

export default function RootAppRedirect() {
  redirect("/dashboard");
}
