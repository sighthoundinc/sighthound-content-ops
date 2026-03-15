import type { AppPermissionKey } from "@/lib/types";

import {
  FieldPermissions,
  createUiPermissionContract,
} from "@/lib/permissions/uiPermissions";

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Assert<T extends true> = T;

export type ScheduledFieldPermissionContract = Assert<
  IsEqual<typeof FieldPermissions.scheduledPublishDate, "edit_scheduled_publish_date">
>;

export type DisplayFieldPermissionContract = Assert<
  IsEqual<typeof FieldPermissions.displayPublishDate, "edit_display_publish_date">
>;

const createLookup = (...permissions: AppPermissionKey[]) => {
  const permissionSet = new Set<AppPermissionKey>(permissions);
  return (permission: AppPermissionKey) => permissionSet.has(permission);
};

const scheduledOnlyContract = createUiPermissionContract(
  createLookup("edit_scheduled_publish_date")
);
const displayOnlyContract = createUiPermissionContract(
  createLookup("edit_display_publish_date")
);
const exportViewOnlyContract = createUiPermissionContract(createLookup("export_csv"));
const exportSelectedOnlyContract = createUiPermissionContract(
  createLookup("export_selected_csv")
);

export const permissionContractSmokeChecks = {
  scheduledEditUsesScheduledPermission:
    scheduledOnlyContract.canEditScheduledPublishDate === true &&
    scheduledOnlyContract.canEditDisplayPublishDate === false,
  displayEditUsesDisplayPermission:
    displayOnlyContract.canEditDisplayPublishDate === true &&
    displayOnlyContract.canEditScheduledPublishDate === false,
  selectedExportDoesNotFallbackToViewExport:
    exportViewOnlyContract.canExportCsv === true &&
    exportViewOnlyContract.canExportSelectedCsv === false,
  selectedExportUsesSelectedPermission:
    exportSelectedOnlyContract.canExportSelectedCsv === true &&
    exportSelectedOnlyContract.canExportCsv === false,
} as const;
