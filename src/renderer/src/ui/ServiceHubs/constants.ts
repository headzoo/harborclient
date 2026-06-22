import type { ServiceHub } from '#/shared/types';

/**
 * Creates an empty service hub form record for add flows.
 *
 * @returns Blank service hub with a default local base URL.
 */
export function createBlankServiceHub(): ServiceHub {
  return {
    id: '',
    name: '',
    baseUrl: 'http://127.0.0.1:8788',
    token: ''
  };
}

/**
 * Validates service hub form fields before save.
 *
 * @param hub - Service hub draft from the edit form.
 * @returns Field-specific validation errors, or null when valid.
 */
export function validateServiceHubForm(hub: ServiceHub): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!hub.name.trim()) {
    errors.name = 'Name is required.';
  }
  if (!hub.baseUrl.trim()) {
    errors.baseUrl = 'Service hub URL is required.';
  }
  if (!hub.token.trim()) {
    errors.token = 'API token is required.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
