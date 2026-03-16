import type { Command } from "./command-palette-config";

/**
 * Simple fuzzy search implementation
 * Matches if search term characters appear in order in the text
 */
export function fuzzyMatch(searchTerm: string, text: string): number {
  const term = searchTerm.toLowerCase();
  const target = text.toLowerCase();

  if (!term) return 0;
  if (target === term) return 1000; // Exact match

  let score = 0;
  let termIndex = 0;
  let prevMatchIndex = -1;

  for (let i = 0; i < target.length && termIndex < term.length; i++) {
    if (target[i] === term[termIndex]) {
      score += 1 + Math.max(0, 10 - (i - prevMatchIndex)); // Bonus for consecutive matches
      prevMatchIndex = i;
      termIndex++;
    }
  }

  // Return score only if all characters matched
  return termIndex === term.length ? score : 0;
}

/**
 * Search commands by label and description
 * Returns sorted results by relevance
 */
export function searchCommands(
  commands: Command[],
  searchTerm: string,
  limit = 10
): Command[] {
  if (!searchTerm.trim()) {
    return commands.slice(0, limit);
  }

  const results = commands
    .map((cmd) => {
      const labelScore = fuzzyMatch(searchTerm, cmd.label);
      const descriptionScore = fuzzyMatch(
        searchTerm,
        cmd.description || ""
      );
      const score = Math.max(labelScore, descriptionScore * 0.5); // Prioritize label matches

      return { command: cmd, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ command }) => command);

  return results;
}

/**
 * Group commands by category
 */
export function groupCommandsByCategory(commands: Command[]): Record<string, Command[]> {
  const grouped: Record<string, Command[]> = {};

  for (const command of commands) {
    if (!grouped[command.category]) {
      grouped[command.category] = [];
    }
    grouped[command.category].push(command);
  }

  return grouped;
}
