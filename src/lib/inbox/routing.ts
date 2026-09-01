export type RoutingStrategy = "round_robin" | "least_loaded" | "manual";

export interface RoutingMember {
  id: string;
  active: boolean;
  load: number;
  weight?: number;
}

/**
 * Selects the next assignee without touching the database. Keeping this
 * decision pure makes routing deterministic and independently testable;
 * persistence/authorization stays in the server-side routing layer.
 */
export function selectAssignee(
  members: RoutingMember[],
  strategy: RoutingStrategy,
  cursor = 0,
): RoutingMember | null {
  const active = members.filter((member) => member.active);
  if (active.length === 0 || strategy === "manual") return null;

  if (strategy === "least_loaded") {
    return active.reduce((best, member) =>
      member.load < best.load ||
      (member.load === best.load && member.id < best.id)
        ? member
        : best,
    );
  }

  // Weighted round-robin: each member receives `weight` consecutive
  // opportunities in a cycle. Invalid/zero weights are normalized to 1.
  const expanded: RoutingMember[] = [];
  for (const member of active) {
    const weight = Math.max(1, Math.floor(member.weight ?? 1));
    for (let i = 0; i < weight; i++) expanded.push(member);
  }

  return expanded[((cursor % expanded.length) + expanded.length) % expanded.length] ?? null;
}

export function nextRoutingCursor(
  members: RoutingMember[],
  currentCursor: number,
): number {
  const active = members.filter((member) => member.active);
  if (active.length === 0) return currentCursor;
  return currentCursor + 1;
}
