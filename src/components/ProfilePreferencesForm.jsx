'use client';

import { useMemo, useState } from 'react';

const FIELDS = [
  { key: 'skin_type', label: 'Skin Type' },
  { key: 'skin_condition', label: 'Skin Condition' },
  { key: 'age', label: 'Age Group' },
  { key: 'skin_tone', label: 'Skin Tone' }
];

function getInitialFieldState(profile, options, key) {
  const value = String(profile?.[key] || '').trim();
  const knownOptions = options?.[key] || [];

  if (!value) {
    return {
      choice: '',
      other: ''
    };
  }

  if (knownOptions.includes(value)) {
    return {
      choice: value,
      other: ''
    };
  }

  return {
    choice: '__other__',
    other: value
  };
}

function ProfilePreferencesForm({ profile, options, action }) {
  const initialState = useMemo(
    () =>
      FIELDS.reduce(
        (state, field) => ({
          ...state,
          [field.key]: getInitialFieldState(profile, options, field.key)
        }),
        {}
      ),
    [profile, options]
  );
  const [values, setValues] = useState(initialState);

  function updateField(key, patch) {
    setValues((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch
      }
    }));
  }

  return (
    <form action={action} className="profile-form">
      <div className="profile-form__identity">
        <label className="profile-field" htmlFor="profile-full-name">
          <span className="profile-field__label">Name</span>
          <input
            id="profile-full-name"
            className="profile-field__control"
            type="text"
            name="full_name"
            defaultValue={profile?.full_name || ''}
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
      </div>

      <div className="profile-form__grid">
        {FIELDS.map((field) => {
          const fieldState = values[field.key] || { choice: '', other: '' };
          const fieldOptions = options?.[field.key] || [];

          return (
            <div className="profile-field" key={field.key}>
              <label className="profile-field__label" htmlFor={field.key}>
                {field.label}
              </label>
              <select
                id={field.key}
                name={`${field.key}_choice`}
                value={fieldState.choice}
                onChange={(event) => updateField(field.key, { choice: event.target.value })}
                className="profile-field__control"
              >
                <option value="">No selection</option>
                {fieldOptions.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
                <option value="__other__">Other</option>
              </select>

              {fieldState.choice === '__other__' ? (
                <input
                  className="profile-field__control profile-field__control--other"
                  type="text"
                  name={`${field.key}_other`}
                  value={fieldState.other}
                  onChange={(event) => updateField(field.key, { other: event.target.value })}
                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                />
              ) : (
                <input type="hidden" name={`${field.key}_other`} value="" />
              )}
            </div>
          );
        })}
      </div>

      <button className="profile-submit" type="submit">
        Save skin profile
      </button>
    </form>
  );
}

export default ProfilePreferencesForm;
