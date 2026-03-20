/**
 * User name matching utilities for import disambiguation
 * Handles exact and partial matching against existing users
 */

export type MatchType = 'exact_full_name' | 'exact_display_name' | 'exact_username' | 'first_and_last_name' | 'first_name' | 'last_name' | 'none';

export type UserCandidate = {
  id: string;
  full_name: string;
  display_name: string | null;
  username: string | null;
  email: string;
  role: string;
  matchType: MatchType;
  confidence: number; // 0-100
};

export type NameResolutionResult = {
  inputName: string;
  candidates: UserCandidate[];
  bestMatch: UserCandidate | null;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Find all matching candidates for a given name
 */
export function findMatches(
  inputName: string,
  users: Array<{
    id: string;
    full_name: string;
    display_name: string | null;
    username: string | null;
    email: string;
    role: string;
  }>
): NameResolutionResult {
  const normalized = normalizeName(inputName);
  const inputFirst = getFirstName(inputName);
  const inputLast = getLastName(inputName);

  const candidates: UserCandidate[] = [];

  for (const user of users) {
    let matchType: MatchType = 'none';
    let confidence = 0;

    // Exact full name match
    if (normalizeName(user.full_name) === normalized) {
      matchType = 'exact_full_name';
      confidence = 100;
    }
    // Exact display name match
    else if (user.display_name && normalizeName(user.display_name) === normalized) {
      matchType = 'exact_display_name';
      confidence = 100;
    }
    // Exact username match
    else if (user.username && normalizeName(user.username) === normalized) {
      matchType = 'exact_username';
      confidence = 100;
    }
    // First + Last name match
    else if (inputFirst && inputLast) {
      const userFirst = getFirstName(user.full_name);
      const userLast = getLastName(user.full_name);
      if (
        normalizeName(userFirst) === normalizeName(inputFirst) &&
        normalizeName(userLast) === normalizeName(inputLast)
      ) {
        matchType = 'first_and_last_name';
        confidence = 95;
      }
    }

    // First name only match
    if (matchType === 'none' && inputFirst) {
      const userFirst = getFirstName(user.full_name);
      if (normalizeName(userFirst) === normalizeName(inputFirst)) {
        matchType = 'first_name';
        confidence = 70;
      }
    }

    // Last name only match
    if (matchType === 'none' && inputLast) {
      const userLast = getLastName(user.full_name);
      if (normalizeName(userLast) === normalizeName(inputLast)) {
        matchType = 'last_name';
        confidence = 60;
      }
    }

    // Add candidate if there's any match
    if (matchType !== 'none') {
      candidates.push({
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        username: user.username,
        email: user.email,
        role: user.role,
        matchType,
        confidence,
      });
    }
  }

  // Sort by match quality: exact > first+last > first > last, then by name
  const matchPriority = {
    exact_full_name: 0,
    exact_display_name: 1,
    exact_username: 2,
    first_and_last_name: 3,
    first_name: 4,
    last_name: 5,
    none: 999,
  };

  candidates.sort((a, b) => {
    const priorityDiff = matchPriority[a.matchType] - matchPriority[b.matchType];
    if (priorityDiff !== 0) return priorityDiff;
    return a.full_name.localeCompare(b.full_name);
  });

  return {
    inputName,
    candidates,
    bestMatch: candidates.length > 0 ? candidates[0] : null,
  };
}

/**
 * Resolve multiple names at once
 */
export function resolveNames(
  inputNames: string[],
  users: Array<{
    id: string;
    full_name: string;
    display_name: string | null;
    username: string | null;
    email: string;
    role: string;
  }>
): NameResolutionResult[] {
  const uniqueNames = Array.from(new Set(inputNames.map((n) => n.trim())));
  return uniqueNames.map((name) => findMatches(name, users));
}
