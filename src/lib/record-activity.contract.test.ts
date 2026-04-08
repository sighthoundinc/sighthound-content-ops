import {
  isAllowedRecordActivityEventType,
  resolveRecordActivityChangedBy,
  resolveRecordActivityTarget,
} from "@/lib/record-activity";

const selfActorResolution = resolveRecordActivityChangedBy({
  requestedChangedBy: "user-1",
  authenticatedUserId: "user-1",
  isAdmin: false,
});

const adminSystemActorResolution = resolveRecordActivityChangedBy({
  requestedChangedBy: "system",
  authenticatedUserId: "admin-1",
  isAdmin: true,
});

const spoofedActorResolution = resolveRecordActivityChangedBy({
  requestedChangedBy: "other-user",
  authenticatedUserId: "user-1",
  isAdmin: false,
});

const missingTargetResolution = resolveRecordActivityTarget({
  contentType: "blog",
  blogId: null,
  socialPostId: null,
});

const mismatchedTargetResolution = resolveRecordActivityTarget({
  contentType: "social_post",
  blogId: "blog-1",
  socialPostId: null,
});

const validTargetResolution = resolveRecordActivityTarget({
  contentType: "blog",
  blogId: "blog-1",
  socialPostId: null,
});

export const recordActivityContractSmokeChecks = {
  actorDefaultsToAuthenticatedUser:
    "changedBy" in selfActorResolution &&
    selfActorResolution.changedBy === "user-1",
  adminCanEmitSystemActor:
    "changedBy" in adminSystemActorResolution &&
    adminSystemActorResolution.changedBy === "system",
  spoofedActorsAreRejected:
    "error" in spoofedActorResolution &&
    spoofedActorResolution.status === 403,
  missingTargetIdsAreRejected:
    "error" in missingTargetResolution &&
    missingTargetResolution.status === 400,
  mismatchedContentTypeTargetsAreRejected:
    "error" in mismatchedTargetResolution &&
    mismatchedTargetResolution.status === 400,
  validTargetIsAccepted:
    "contentId" in validTargetResolution &&
    validTargetResolution.contentId === "blog-1",
  knownEventTypesAreAllowed:
    isAllowedRecordActivityEventType("social_publish_overdue") === true,
  unknownEventTypesAreRejected:
    isAllowedRecordActivityEventType("not_a_real_event") === false,
} as const;
