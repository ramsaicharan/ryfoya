export const PREFERENCE_FIELDS = ['skin_type', 'skin_condition', 'age', 'skin_tone'];

export function isProfileIncomplete(profile) {
  if (!profile) {
    return true;
  }

  return PREFERENCE_FIELDS.every((field) => !String(profile[field] || '').trim());
}

export function buildPreferenceOptions(personas) {
  return PREFERENCE_FIELDS.reduce((options, field) => {
    const values = new Set();

    for (const persona of personas || []) {
      const value = String(persona?.[field] || '').trim();
      if (value) {
        values.add(value);
      }
    }

    return {
      ...options,
      [field]: [...values].sort((left, right) => left.localeCompare(right))
    };
  }, {});
}
