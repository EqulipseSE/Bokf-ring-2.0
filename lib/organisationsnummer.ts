// Delad validering av organisationsnummer (format NNNNNN-NNNN).
// Används både som pattern i formulär och i server actions.

export const ORGNR_PATTERN = "\\d{6}-\\d{4}";

const ORGNR_REGEX = new RegExp(`^${ORGNR_PATTERN}$`);

export function isValidOrgNumber(value: string): boolean {
  return ORGNR_REGEX.test(value);
}
