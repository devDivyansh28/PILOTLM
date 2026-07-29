import { getRAGConfig } from "@/lib/providers/registry";

export function getRAGStepPrompt(step: "queryRewrite" | "stepBack" | "subQueryDecomposition" | "hyde" | "generation"): string {
  return getRAGConfig()[step].prompt;
}

export function formatPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || '');
}