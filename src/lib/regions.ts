// Fixed list of Greek geographic regions used throughout the app (matches
// the regional breakdown of the seeded store dataset). Shared between the
// "Add store" form and the Vision AI extraction schema so both agree on the
// same controlled vocabulary.
export const GREEK_REGIONS = [
  "Αττική",
  "Στερεά Ελλάδα",
  "Πελοπόννησος",
  "Ιόνια Νησιά",
  "Ήπειρος",
  "Θεσσαλία",
  "Μακεδονία",
  "Θράκη",
  "Νησιά Αιγαίου",
  "Κρήτη",
  "Χαλκιδική",
] as const;
