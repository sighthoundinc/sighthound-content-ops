"use client";

import { useEffect, useMemo, useState } from "react";
import type { NameResolutionResult, UserCandidate } from "@/lib/user-matching";
import { Button } from "@/components/button";
import { SuccessIcon } from "@/lib/icons";

export type NameResolution = {
  action: "use_existing" | "create_new";
  selectedUserId?: string;
};

export type NameResolutionState = Record<string, NameResolution>;

interface NameResolutionModalProps {
  isOpen: boolean;
  isLoading: boolean;
  resolutions: NameResolutionResult[];
  selectedResolutions: NameResolutionState;
  onResolutionsChange: (resolutions: NameResolutionState) => void;
  onConfirm: () => void;
  onClose: () => void;
  showManualMode?: boolean;
}

export function NameResolutionModal({
  isOpen,
  isLoading,
  resolutions,
  selectedResolutions,
  onResolutionsChange,
  onConfirm,
  onClose,
}: NameResolutionModalProps) {
  const [localResolutions, setLocalResolutions] =
    useState<NameResolutionState>(selectedResolutions);

  useEffect(() => {
    setLocalResolutions(selectedResolutions);
  }, [selectedResolutions]);

  const allResolved = useMemo(() => {
    return resolutions.every((r) => localResolutions[r.inputName]);
  }, [resolutions, localResolutions]);

  const handleSelectCandidate = (name: string, userId: string) => {
    setLocalResolutions((prev) => ({
      ...prev,
      [name]: {
        action: "use_existing",
        selectedUserId: userId,
      },
    }));
  };

  const handleCreateNew = (name: string) => {
    setLocalResolutions((prev) => ({
      ...prev,
      [name]: {
        action: "create_new",
      },
    }));
  };

  const handleAutoResolveAll = () => {
    const newResolutions: NameResolutionState = {};
    for (const resolution of resolutions) {
      if (resolution.bestMatch) {
        newResolutions[resolution.inputName] = {
          action: "use_existing",
          selectedUserId: resolution.bestMatch.id,
        };
      } else {
        newResolutions[resolution.inputName] = {
          action: "create_new",
        };
      }
    }
    setLocalResolutions(newResolutions);
  };

  const handleCreateAllMissing = () => {
    const newResolutions = { ...localResolutions };
    for (const resolution of resolutions) {
      if (!newResolutions[resolution.inputName]) {
        newResolutions[resolution.inputName] = {
          action: "create_new",
        };
      }
    }
    setLocalResolutions(newResolutions);
  };

  const handleClearAll = () => {
    setLocalResolutions({});
  };

  const handleConfirm = () => {
    onResolutionsChange(localResolutions);
    onConfirm();
  };

  if (!isOpen) return null;

  const resolvedCount = Object.keys(localResolutions).length;
  const totalCount = resolutions.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="w-full max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col max-w-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Resolve Writer & Publisher Names</h2>
          <p className="text-sm text-gray-600 mt-1">
            Match imported names with existing users to avoid creating duplicates
          </p>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="text-sm text-gray-700 font-medium">
            {resolvedCount} of {totalCount} names resolved
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="px-6 py-4 border-b flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAutoResolveAll}
            disabled={isLoading}
          >
            Auto-Resolve All
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateAllMissing}
            disabled={isLoading}
          >
            Create All Missing
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClearAll}
            disabled={isLoading}
          >
            Clear All
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="inline-block mr-2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Searching for matching users...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {resolutions.map((resolution) => {
                const current = localResolutions[resolution.inputName];
                return (
                  <NameResolutionItem
                    key={resolution.inputName}
                    resolution={resolution}
                    currentSelection={current}
                    onSelectCandidate={(userId) =>
                      handleSelectCandidate(resolution.inputName, userId)
                    }
                    onCreateNew={() => handleCreateNew(resolution.inputName)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allResolved || isLoading}>
            {isLoading ? "Loading..." : "Continue to Preview"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NameResolutionItemProps {
  resolution: NameResolutionResult;
  currentSelection?: NameResolution;
  onSelectCandidate: (userId: string) => void;
  onCreateNew: () => void;
}

function NameResolutionItem({
  resolution,
  currentSelection,
  onSelectCandidate,
  onCreateNew,
}: NameResolutionItemProps) {
  const { inputName, candidates, bestMatch } = resolution;
  const isCreateNewSelected = currentSelection?.action === "create_new";

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{inputName}</p>
          {bestMatch && (
            <p className="text-xs text-gray-500 mt-1">
              Best match:{" "}
              <span className="font-medium text-gray-700">{bestMatch.full_name}</span>
            </p>
          )}
        </div>
        <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
          {candidates.length} match{candidates.length !== 1 ? "es" : ""}
        </span>
      </div>

      {candidates.length > 0 ? (
        <div className="space-y-2 mb-3">
          {candidates.map((candidate) => (
            <CandidateButton
              key={candidate.id}
              candidate={candidate}
              isSelected={
                currentSelection?.action === "use_existing" &&
                currentSelection?.selectedUserId === candidate.id
              }
              isBestMatch={candidate.id === bestMatch?.id}
              onClick={() => onSelectCandidate(candidate.id)}
            />
          ))}
        </div>
      ) : null}

      <button
        onClick={onCreateNew}
        className={`w-full px-3 py-2 text-sm rounded border transition-colors ${
          isCreateNewSelected
            ? "bg-blue-50 border-blue-300 text-blue-900"
            : "border-gray-300 text-gray-700 hover:border-gray-400"
        }`}
      >
        {isCreateNewSelected && (
          <span className="mr-2 inline-flex">
            <SuccessIcon boxClassName="h-4 w-4" size={13} />
          </span>
        )}
        Create New User
      </button>
    </div>
  );
}

interface CandidateButtonProps {
  candidate: UserCandidate;
  isSelected: boolean;
  isBestMatch: boolean;
  onClick: () => void;
}

function CandidateButton({
  candidate,
  isSelected,
  isBestMatch,
  onClick,
}: CandidateButtonProps) {
  const matchTypeLabel = {
    exact_full_name: "Exact Full Name",
    exact_display_name: "Exact Display Name",
    exact_username: "Exact Username",
    exact_email: "Exact Email",
    exact_email_local_part: "Exact Email Prefix",
    contains_full_name: "Contains Full Name",
    contains_display_name: "Contains Display Name",
    contains_username: "Contains Username",
    contains_email_local_part: "Contains Email Prefix",
    token_overlap: "Token Overlap",
    first_and_last_name: "First & Last Name",
    first_name: "First Name",
    last_name: "Last Name",
    none: "No Match",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left rounded border transition-colors ${
        isSelected
          ? "bg-blue-50 border-blue-300"
          : isBestMatch
            ? "bg-green-50 border-green-200"
            : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{candidate.full_name}</span>
            {isBestMatch && <span className="text-xs font-semibold text-green-700">★ Recommended</span>}
            {isSelected && (
              <span className="inline-flex text-blue-700">
                <SuccessIcon boxClassName="h-4 w-4" size={13} />
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{candidate.email}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-gray-500">{matchTypeLabel[candidate.matchType]}</span>
            <span className="text-xs text-gray-400 font-medium">{candidate.confidence}% match</span>
          </div>
        </div>
      </div>
    </button>
  );
}
