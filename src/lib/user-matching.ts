/**
 * User name matching utilities for import disambiguation
 * Handles exact and partial matching against existing users
 */

export type MatchType =
  | 'exact_full_name'
  | 'exact_display_name'
  | 'exact_username'
  | 'exact_email'
  | 'exact_email_local_part'
  | 'contains_full_name'
  | 'contains_display_name'
  | 'contains_username'
  | 'contains_email_local_part'
  | 'token_overlap'
  | 'first_and_last_name'
  | 'first_name'
  | 'last_name'
  | 'none';

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
type MatchableUser = {
  id: string;
  full_name: string;
  display_name: string | null;
  username: string | null;
  email: string;
  role: string;
  first_name?: string | null;
  last_name?: string | null;
};

function normalizeName(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[@._-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function splitIdentityParts(value: string | null | undefined): string[] {
  return normalizeName(value).split(/\s+/).filter(Boolean);
}

function toTokens(value: string): string[] {
  return value.split(/\s+/).filter((token) => token.length >= 2);
}

function containsConfidence(input: string, candidate: string, minBase: number): number {
  if (!input || !candidate || input === candidate) {
    return 0;
  }
  if (!input.includes(candidate) && !candidate.includes(input)) {
    return 0;
  }
  const shorter = Math.min(input.length, candidate.length);
  const longer = Math.max(input.length, candidate.length);
  if (shorter < 3 || longer === 0) {
    return 0;
  }
  const ratio = shorter / longer;
  return Math.max(minBase, Math.min(92, Math.round(minBase + ratio * 24)));
}

function tokenOverlapConfidence(inputTokens: string[], candidateTokens: string[]): number {
  if (inputTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }
  const inputSet = new Set(inputTokens);
  const candidateSet = new Set(candidateTokens);
  let overlap = 0;
  for (const token of inputSet) {
    if (candidateSet.has(token)) {
      overlap += 1;
    }
  }
  if (overlap === 0) {
    return 0;
  }
  const coverageInput = overlap / inputSet.size;
  const coverageCandidate = overlap / candidateSet.size;
  const weightedCoverage = coverageInput * 0.7 + coverageCandidate * 0.3;
  return Math.max(55, Math.min(88, Math.round(55 + weightedCoverage * 30)));
}

function collectFirstNameCandidates(user: MatchableUser): Set<string> {
  const candidates = new Set<string>();
  const emailLocalPart = user.email.split('@')[0] ?? '';
  const tokens = [
    normalizeName(user.first_name),
    normalizeName(getFirstName(user.full_name)),
    normalizeName(getFirstName(user.display_name ?? '')),
    splitIdentityParts(user.username)[0] ?? '',
    splitIdentityParts(emailLocalPart)[0] ?? '',
  ];

  for (const token of tokens) {
    if (token) {
      candidates.add(token);
    }
  }
  return candidates;
}

function collectLastNameCandidates(user: MatchableUser): Set<string> {
  const candidates = new Set<string>();
  const emailLocalPart = user.email.split('@')[0] ?? '';
  const usernameParts = splitIdentityParts(user.username);
  const emailParts = splitIdentityParts(emailLocalPart);
  const tokens = [
    normalizeName(user.last_name),
    normalizeName(getLastName(user.full_name)),
    normalizeName(getLastName(user.display_name ?? '')),
    usernameParts.length > 1 ? usernameParts[usernameParts.length - 1] : '',
    emailParts.length > 1 ? emailParts[emailParts.length - 1] : '',
  ];

  for (const token of tokens) {
    if (token) {
      candidates.add(token);
    }
  }
  return candidates;
}

/**
 * Find all matching candidates for a given name
 */
export function findMatches(
  inputName: string,
  users: MatchableUser[]
): NameResolutionResult {
  const normalized = normalizeName(inputName);
  const inputEmail = normalizeEmail(inputName);
  const inputTokens = toTokens(normalized);
  const inputFirst = inputTokens[0] ?? '';
  const inputLast = inputTokens.length > 1 ? inputTokens[inputTokens.length - 1] : '';

  const candidates: UserCandidate[] = [];

  for (const user of users) {
    const normalizedFullName = normalizeName(user.full_name);
    const normalizedDisplayName = normalizeName(user.display_name);
    const normalizedUsername = normalizeName(user.username);
    const normalizedEmail = normalizeEmail(user.email);
    const normalizedEmailLocalPart = normalizeName(user.email.split('@')[0] ?? '');
    const explicitFirstLast = normalizeName(
      [normalizeName(user.first_name), normalizeName(user.last_name)].filter(Boolean).join(' ')
    );
    const firstCandidates = collectFirstNameCandidates(user);
    const lastCandidates = collectLastNameCandidates(user);
    const candidateMatches: Array<{ matchType: MatchType; confidence: number }> = [];
    const addMatch = (matchType: MatchType, confidence: number) => {
      if (confidence > 0) {
        candidateMatches.push({ matchType, confidence });
      }
    };

    if (normalizedFullName === normalized || (explicitFirstLast && explicitFirstLast === normalized)) {
      addMatch('exact_full_name', 100);
    }
    if (normalizedDisplayName && normalizedDisplayName === normalized) {
      addMatch('exact_display_name', 100);
    }
    if (normalizedUsername && normalizedUsername === normalized) {
      addMatch('exact_username', 100);
    }
    if (normalizedEmail && normalizedEmail === inputEmail) {
      addMatch('exact_email', 100);
    }
    if (normalizedEmailLocalPart && normalizedEmailLocalPart === normalized) {
      addMatch('exact_email_local_part', 96);
    }
    if (inputFirst && inputLast && firstCandidates.has(inputFirst) && lastCandidates.has(inputLast)) {
      addMatch('first_and_last_name', 95);
    }
    if (inputFirst && firstCandidates.has(inputFirst)) {
      addMatch('first_name', 70);
    }
    if (inputLast && lastCandidates.has(inputLast)) {
      addMatch('last_name', 60);
    }

    addMatch('contains_full_name', containsConfidence(normalized, normalizedFullName, 68));
    addMatch('contains_display_name', containsConfidence(normalized, normalizedDisplayName, 69));
    addMatch('contains_username', containsConfidence(normalized, normalizedUsername, 67));
    addMatch(
      'contains_email_local_part',
      containsConfidence(normalized, normalizedEmailLocalPart, 66)
    );

    const tokenOverlapScore = Math.max(
      tokenOverlapConfidence(inputTokens, toTokens(normalizedFullName)),
      tokenOverlapConfidence(inputTokens, toTokens(normalizedDisplayName)),
      tokenOverlapConfidence(inputTokens, toTokens(normalizedUsername)),
      tokenOverlapConfidence(inputTokens, toTokens(normalizedEmailLocalPart)),
      tokenOverlapConfidence(inputTokens, toTokens(explicitFirstLast))
    );
    addMatch('token_overlap', tokenOverlapScore);

    if (candidateMatches.length > 0) {
      const bestForUser = candidateMatches.sort((a, b) => {
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        const matchPriority = {
          exact_full_name: 0,
          exact_display_name: 1,
          exact_username: 2,
          exact_email: 3,
          exact_email_local_part: 4,
          first_and_last_name: 5,
          contains_full_name: 6,
          contains_display_name: 7,
          contains_username: 8,
          contains_email_local_part: 9,
          token_overlap: 10,
          first_name: 11,
          last_name: 12,
          none: 999,
        };
        return matchPriority[a.matchType] - matchPriority[b.matchType];
      })[0];
      candidates.push({
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        username: user.username,
        email: user.email,
        role: user.role,
        matchType: bestForUser.matchType,
        confidence: bestForUser.confidence,
      });
    }
  }

  // Sort by match quality: exact > first+last > first > last, then by name
  const matchPriority = {
    exact_full_name: 0,
    exact_display_name: 1,
    exact_username: 2,
    exact_email: 3,
    exact_email_local_part: 4,
    first_and_last_name: 5,
    contains_full_name: 6,
    contains_display_name: 7,
    contains_username: 8,
    contains_email_local_part: 9,
    token_overlap: 10,
    first_name: 11,
    last_name: 12,
    none: 999,
  };

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
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
  users: MatchableUser[]
): NameResolutionResult[] {
  const uniqueNames = Array.from(new Set(inputNames.map((n) => n.trim())));
  return uniqueNames.map((name) => findMatches(name, users));
}
