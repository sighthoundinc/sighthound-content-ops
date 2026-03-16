"use client";

import React from "react";
import { useGlobalQuickCreate } from "@/hooks/use-global-quick-create";
import { useRouter } from "next/navigation";

export function GlobalQuickCreate() {
  const { isOpen, close } = useGlobalQuickCreate();
  const router = useRouter();

  const handleCreateBlog = () => {
    router.push("/blogs/new");
    close();
  };

  const handleCreateSocialPost = () => {
    router.push("/social-posts?create=1");
    close();
  };

  const handleCreateIdea = () => {
    router.push("/ideas");
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="absolute inset-x-0 top-1/3 flex justify-center">
        <div
          className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-create-title"
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2
              id="quick-create-title"
              className="text-lg font-semibold text-gray-900"
            >
              Create New
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Press C to open, ESC to close
            </p>
          </div>

          {/* Actions */}
          <div className="divide-y divide-gray-100">
            <button
              onClick={handleCreateBlog}
              className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-label="Create new blog post"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <div className="font-medium text-gray-900">New Blog</div>
                  <div className="text-sm text-gray-500">
                    Create a new blog post
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={handleCreateSocialPost}
              className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-label="Create new social post"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📤</span>
                <div>
                  <div className="font-medium text-gray-900">New Social Post</div>
                  <div className="text-sm text-gray-500">
                    Create a new social media post
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={handleCreateIdea}
              className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-label="Create new idea"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="font-medium text-gray-900">New Idea</div>
                  <div className="text-sm text-gray-500">
                    Add a new content idea
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold">
              C
            </kbd>
            <span className="ml-2">to create</span>
          </div>
        </div>
      </div>
    </div>
  );
}
