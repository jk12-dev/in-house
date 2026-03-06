import { AssignmentManager } from "@/components/evaluation/assignment-manager";

export default async function Review360DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AssignmentManager cycleId={id} backHref="/review-360" />;
}
