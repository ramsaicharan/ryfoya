'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const FILTER_GROUPS = [
  { key: 'skin_type', label: 'Skin Type' },
  { key: 'skin_condition', label: 'Skin Condition' },
  { key: 'age', label: 'Age' },
  { key: 'skin_tone', label: 'Skin Tone' }
];

function normalizeValue(value) {
  return String(value || '').trim();
}

function getSelection(persona) {
  return FILTER_GROUPS.reduce((accumulator, group) => {
    accumulator[group.key] = normalizeValue(persona?.[group.key]);
    return accumulator;
  }, {});
}

function isSelectionEmpty(selection) {
  return FILTER_GROUPS.every((group) => !normalizeValue(selection[group.key]));
}

function matchesSelection(page, selection, ignoredKey = '') {
  return FILTER_GROUPS.every((group) => {
    if (group.key === ignoredKey) {
      return true;
    }

    const selectedValue = normalizeValue(selection[group.key]);
    if (!selectedValue) {
      return true;
    }

    return normalizeValue(page[group.key]) === selectedValue;
  });
}

function findExactPersona(pages, selection) {
  return (
    pages.find((page) =>
      FILTER_GROUPS.every(
        (group) => normalizeValue(page[group.key]) === normalizeValue(selection[group.key])
      )
    ) || null
  );
}

function countFilledFields(page) {
  return FILTER_GROUPS.reduce(
    (count, group) => count + (normalizeValue(page[group.key]) ? 1 : 0),
    0
  );
}

function countSameFieldMatches(page, selection) {
  return FILTER_GROUPS.reduce((count, group) => {
    const selectedValue = normalizeValue(selection[group.key]);
    if (!selectedValue) {
      return count;
    }

    return count + (normalizeValue(page[group.key]) === selectedValue ? 1 : 0);
  }, 0);
}

function countAnyFieldMatches(page, selection) {
  const pageValues = FILTER_GROUPS.map((group) => normalizeValue(page[group.key])).filter(Boolean);

  return FILTER_GROUPS.reduce((count, group) => {
    const selectedValue = normalizeValue(selection[group.key]);
    if (!selectedValue) {
      return count;
    }

    return count + (pageValues.includes(selectedValue) ? 1 : 0);
  }, 0);
}

function findBestFallbackPersona(pages, selection) {
  const selectedValues = FILTER_GROUPS.map((group) => normalizeValue(selection[group.key])).filter(Boolean);

  if (selectedValues.length === 0) {
    return null;
  }

  const candidates = pages.filter((page) => {
    const pageValues = FILTER_GROUPS.map((group) => normalizeValue(page[group.key])).filter(Boolean);
    return selectedValues.every((selectedValue) => pageValues.includes(selectedValue));
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => {
    const leftSameFieldMatches = countSameFieldMatches(left, selection);
    const rightSameFieldMatches = countSameFieldMatches(right, selection);

    if (leftSameFieldMatches !== rightSameFieldMatches) {
      return rightSameFieldMatches - leftSameFieldMatches;
    }

    const leftAnyFieldMatches = countAnyFieldMatches(left, selection);
    const rightAnyFieldMatches = countAnyFieldMatches(right, selection);

    if (leftAnyFieldMatches !== rightAnyFieldMatches) {
      return rightAnyFieldMatches - leftAnyFieldMatches;
    }

    const leftFilledFields = countFilledFields(left);
    const rightFilledFields = countFilledFields(right);

    if (leftFilledFields !== rightFilledFields) {
      return leftFilledFields - rightFilledFields;
    }

    return normalizeValue(left.page_slug).localeCompare(normalizeValue(right.page_slug));
  })[0];
}

function getSelectionHref(pages, selection) {
  if (isSelectionEmpty(selection)) {
    return '/sunscreens';
  }

  const persona = findExactPersona(pages, selection) || findBestFallbackPersona(pages, selection);
  return persona?.page_slug ? `/${persona.page_slug}` : '/sunscreens';
}

function formatOptionLabel(groupKey, value) {
  const safeValue = normalizeValue(value);
  if (!safeValue) {
    return '';
  }

  if (groupKey === 'skin_type' && !/skin/i.test(safeValue)) {
    return `${safeValue} Skin`;
  }

  return safeValue;
}

function buildGroupOptions(pages, selection, groupKey) {
  const values = [];
  const seen = new Set();

  for (const page of pages) {
    if (!page.page_slug || !matchesSelection(page, selection, groupKey)) {
      continue;
    }

    const value = normalizeValue(page[groupKey]);
    if (!value || seen.has(value)) {
      continue;
    }

    const nextSelection = { ...selection, [groupKey]: value };
    const href = getSelectionHref(pages, nextSelection);

    seen.add(value);
    values.push({
      value,
      href,
      isActive: value === normalizeValue(selection[groupKey]),
      label: formatOptionLabel(groupKey, value)
    });
  }

  return values;
}

function FiltersContent({
  activeSelections,
  clearAllHref,
  onNavigate,
  selection,
  validPages
}) {
  return (
    <>
      <div className="persona-filters__selected-head">
        <h2 className="persona-filters__selected-title">Selected</h2>
        {activeSelections.length > 0 ? (
          <button type="button" className="persona-filters__clear" onClick={() => onNavigate(clearAllHref)}>
            Clear all
          </button>
        ) : null}
      </div>

      {activeSelections.length > 0 ? (
        <div className="persona-filters__active">
          {activeSelections.map((item) => (
            <button
              type="button"
              className="persona-chip persona-chip--active"
              key={item.key}
              onClick={() => onNavigate(item.href)}
            >
              <span className="persona-chip__close" aria-hidden="true">
                ×
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="persona-filters__groups">
        {FILTER_GROUPS.map((group) => {
          const options = buildGroupOptions(validPages, selection, group.key);

          if (options.length === 0) {
            return null;
          }

          return (
            <section className="persona-filter-group" key={group.key}>
              <h3 className="persona-filter-group__title">{group.label}</h3>
              <div className="persona-filter-group__options">
                {options.map((option) => (
                  <button
                    type="button"
                    className={`persona-option ${option.isActive ? 'persona-option--selected' : ''}`}
                    key={`${group.key}-${option.value}`}
                    onClick={() => onNavigate(option.href)}
                  >
                    <span className="persona-option__box" aria-hidden="true">
                      {option.isActive ? '✓' : ''}
                    </span>
                    <span className="persona-option__label">{option.label}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function PersonaChoiceSidebar({ pages, currentPersona }) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const router = useRouter();
  const validPages = useMemo(() => (pages || []).filter((page) => page?.page_slug), [pages]);
  const selection = useMemo(() => getSelection(currentPersona), [currentPersona]);
  const clearAllHref = '/sunscreens';
  const activeSelections = useMemo(
    () =>
      FILTER_GROUPS.map((group) => ({
        key: group.key,
        label: formatOptionLabel(group.key, selection[group.key]),
        href: getSelectionHref(validPages, { ...selection, [group.key]: '' })
      })).filter((item) => item.label),
    [selection, validPages]
  );

  const closeSheet = () => setIsMobileSheetOpen(false);
  const navigateTo = (href) => {
    closeSheet();
    router.push(href);
  };

  return (
    <>
      <aside className="persona-filters persona-filters--desktop">
        <div className="persona-filters__sticky">
          <FiltersContent
            activeSelections={activeSelections}
            clearAllHref={clearAllHref}
            onNavigate={navigateTo}
            selection={selection}
            validPages={validPages}
          />
        </div>
      </aside>

      <div className="persona-filters-mobile">
        <button
          type="button"
          className="persona-filters-mobile__trigger"
          onClick={() => setIsMobileSheetOpen(true)}
        >
          Filters
          {activeSelections.length > 0 ? (
            <span className="persona-filters-mobile__count">{activeSelections.length}</span>
          ) : null}
        </button>

        <div
          className={`persona-sheet__backdrop ${isMobileSheetOpen ? 'persona-sheet__backdrop--open' : ''}`}
          onClick={closeSheet}
        />
        <div className={`persona-sheet ${isMobileSheetOpen ? 'persona-sheet--open' : ''}`}>
          <div className="persona-sheet__handle" aria-hidden="true" />
          <button type="button" className="persona-sheet__close" onClick={closeSheet} aria-label="Close filters">
            ×
          </button>
          <div className="persona-sheet__body">
            <FiltersContent
              activeSelections={activeSelections}
              clearAllHref={clearAllHref}
              onNavigate={navigateTo}
              selection={selection}
              validPages={validPages}
            />
          </div>
        </div>
      </div>
    </>
  );
}
