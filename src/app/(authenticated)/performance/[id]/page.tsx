import { AssignmentManager } from "@/components/evaluation/assignment-manager";

export default async function PerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AssignmentManager cycleId={id} backHref="/performance" />;
}
