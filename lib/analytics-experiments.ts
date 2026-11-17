import { prisma } from "@/lib/prisma";

export function listExperiments(appId: string) {
  return prisma.analyticsExperiment.findMany({ where: { appId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}

export function createExperiment(appId: string, text: string) {
  return prisma.analyticsExperiment.create({ data: { appId, text } });
}

export async function updateExperiment(appId: string, id: string, data: { text?: string; completed?: boolean }) {
  // Scope the write itself so an ID from another app cannot be modified.
  const items = await prisma.analyticsExperiment.updateManyAndReturn({ where: { id, appId }, data });
  return items[0] ?? null;
}

export async function deleteExperiment(appId: string, id: string) {
  const result = await prisma.analyticsExperiment.deleteMany({ where: { id, appId } });
  return result.count > 0;
}
