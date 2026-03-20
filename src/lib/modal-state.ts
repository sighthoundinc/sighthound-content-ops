// Shared modal state to prevent multiple modals opening simultaneously
let activeModalId: string | null = null;

export function setActiveModal(id: string | null) {
  activeModalId = id;
}

export function getActiveModal(): string | null {
  return activeModalId;
}

export function isModalOpen(): boolean {
  return activeModalId !== null;
}
