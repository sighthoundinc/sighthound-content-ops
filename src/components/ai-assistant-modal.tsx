"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { AppIcon, type AppIconName } from "@/lib/icons";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";

export type BlockerSeverity = "critical" | "warning" | "info";

export type Blocker = {
  type: string;
  field?: string;
  message: string;
  severity: BlockerSeverity;
};

export type QualityIssue = {
  field: string;
  message: string;
  severity: BlockerSeverity;
};

export type AiAssistantResponse = {
  currentState: {
    entityType: "blog" | "social_post";
    status: string;
    userRole: string;
    isOwner: boolean;
  };
  blockers: Blocker[];
  nextSteps: string[];
  qualityIssues: QualityIssue[];
  canProceed: boolean;
  confidence: number;
};

type AiAssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entityType: "blog" | "social_post";
  entityId: string;
  userRole: string;
  onRefresh?: () => void;
};

const BLOCKER_ICON: Record<BlockerSeverity, AppIconName> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

const BLOCKER_COLOR: Record<BlockerSeverity, string> = {
  critical: "text-red-600 bg-red-50",
  warning: "text-amber-600 bg-amber-50",
  info: "text-blue-600 bg-blue-50",
};

export function AiAssistantModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  userRole,
  onRefresh,
}: AiAssistantModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AiAssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAssistantResponse = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          userRole,
        }),
      });

      const json = await parseApiResponseJson(res);

      if (isApiFailure(res, json)) {
        setError(getApiErrorMessage(json, "Failed to get AI response"));
        return;
      }

      if (json && typeof json === "object" && "success" in json && json.success && "data" in json && json.data) {
        setResponse(json.data as AiAssistantResponse);
      } else {
        setError("No response from AI assistant");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch AI assistant response"
      );
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, userRole]);

  useEffect(() => {
    if (isOpen && !response && !error) {
      fetchAssistantResponse();
    }
  }, [isOpen, response, error, fetchAssistantResponse]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
              <AppIcon name="info" className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Ask AI</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Close modal"
          >
            <AppIcon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AppIcon
                  name="loading"
                  className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2"
                />
                <p className="text-slate-600">Analyzing...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {response && !isLoading && (
            <div className="space-y-6">
              {/* Current State */}
              <section>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Current State
                </h3>
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">
                      Entity Type
                    </p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {response.currentState.entityType === "social_post"
                        ? "Social Post"
                        : "Blog"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">
                      Status
                    </p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {response.currentState.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">
                      Your Role
                    </p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {response.currentState.userRole}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">
                      Owner
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {response.currentState.isOwner ? "You" : "Other"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Blockers */}
              {response.blockers.length > 0 && (
                <section>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Blockers ({response.blockers.length})
                  </h3>
                  <div className="space-y-2">
                    {response.blockers.map((blocker, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${BLOCKER_COLOR[blocker.severity]} flex items-start gap-3`}
                      >
                        <AppIcon
                          name={BLOCKER_ICON[blocker.severity]}
                          className={`w-5 h-5 flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p className="text-sm font-semibold">
                            {blocker.message}
                          </p>
                          {blocker.field && (
                            <p className="text-xs opacity-75 mt-1">
                              Field: {blocker.field}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Quality Issues */}
              {response.qualityIssues.length > 0 && (
                <section>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Quality Issues ({response.qualityIssues.length})
                  </h3>
                  <div className="space-y-2">
                    {response.qualityIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-start gap-3"
                      >
                        <AppIcon
                          name="warning"
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-semibold">
                            {issue.message}
                          </p>
                          <p className="text-xs opacity-75 mt-1">
                            {issue.field}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Next Steps */}
              {response.nextSteps.length > 0 && (
                <section>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Next Steps
                  </h3>
                  <ol className="space-y-2">
                    {response.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-slate-700 pt-0.5">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Summary */}
              <section>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-900">
                      Can Proceed
                    </p>
                    <span
                      className={`text-sm font-semibold ${
                        response.canProceed
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {response.canProceed ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-900">
                      Confidence
                    </p>
                    <span className="text-sm font-semibold text-blue-600">
                      {response.confidence}%
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setResponse(null);
              setError(null);
              fetchAssistantResponse();
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <AppIcon name="loading" className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onRefresh?.();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
