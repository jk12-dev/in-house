import { EvaluationForm } from "@/components/evaluation/evaluation-form";

export default async function EvaluationFormPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;

  return <EvaluationForm assignmentId={assignmentId} />;
}
