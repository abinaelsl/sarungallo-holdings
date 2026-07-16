import { notFound } from "next/navigation";
import MemberDetailClient from "./MemberDetailClient";
import type { MemberId } from "@/lib/retirement/types";

const VALID: MemberId[] = ["dad", "mom", "son"];

export function generateStaticParams() {
  return VALID.map((member) => ({ member }));
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ member: string }>;
}) {
  const { member } = await params;
  if (!VALID.includes(member as MemberId)) notFound();
  return <MemberDetailClient memberId={member as MemberId} />;
}
