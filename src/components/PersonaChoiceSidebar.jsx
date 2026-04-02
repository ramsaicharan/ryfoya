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

function normalizeSensitiveSelection(selection) {
  const skinType = normalizeValue(selection.skin_type);
  const skinCondition = normalizeValue(selection.skin_condition);
  const age = normalizeValue(selection.age);
  const skinTone = normalizeValue(selection.skin_tone);
  const hasOtherSelections = Boolean(age || skinTone);
  const isSensitiveOnlyInSkinType =
    skinType === 'Sensitive' && !skinCondition && !hasOtherSelections;
  const isSensitiveOnlyInSkinCondition =
    skinCondition === 'Sensitive' && !skinType && !hasOtherSelections;

  if (isSensitiveOnlyInSkinType || isSensitiveOnlyInSkinCondition) {
    return {
      ...selection,
      skin_type: '',
      skin_condition: 'Sensitive'
    };
  }

  return selection;
}

function isSensitiveOnlyFallbackSelection(selection) {
  return (
    !normalizeValue(selection.skin_type)
    && normalizeValue(selection.skin_condition) === 'Sensitive'
    && !normalizeValue(selection.age)
    && !normalizeValue(selection.skin_tone)
  );
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

    return normalizeValue(left.route_slug || left.page_slug).localeCompare(
      normalizeValue(right.route_slug || right.page_slug)
    );
  })[0];
}

function getPersonaHref(page) {
  const routeSlug = normalizeValue(page?.route_slug);
  if (routeSlug) {
    return `/sunscreens/best/${routeSlug}`;
  }

  const pageSlug = normalizeValue(page?.page_slug);
  return pageSlug ? `/${pageSlug}` : '/sunscreens';
}

function buildCounterpartSelection(selection, fromKey, toKey) {
  const value = normalizeValue(selection[fromKey]);

  if (!value) {
    return null;
  }

  return { ...selection, [fromKey]: '', [toKey]: value };
}

function findCounterpartPersona(pages, selection) {
  const filledGroups = FILTER_GROUPS.filter((group) => normalizeValue(selection[group.key]));

  if (filledGroups.length !== 1) {
    return null;
  }

  const onlyGroup = filledGroups[0].key;

  if (onlyGroup === 'skin_type') {
    const counterpartSelection = buildCounterpartSelection(selection, 'skin_type', 'skin_condition');
    return counterpartSelection ? findExactPersona(pages, counterpartSelection) : null;
  }

  if (onlyGroup === 'skin_condition') {
    const counterpartSelection = buildCounterpartSelection(selection, 'skin_condition', 'skin_type');
    return counterpartSelection ? findExactPersona(pages, counterpartSelection) : null;
  }

  return null;
}

function getSelectionHref(pages, selection) {
  const normalizedSelection = normalizeSensitiveSelection(selection);

  if (isSelectionEmpty(normalizedSelection)) {
    return '/sunscreens';
  }

  const persona =
    findExactPersona(pages, normalizedSelection)
    || findBestFallbackPersona(pages, normalizedSelection)
    || findCounterpartPersona(pages, normalizedSelection);

  return persona ? getPersonaHref(persona) : '/sunscreens';
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

function buildNextSelection(selection, groupKey, value) {
  const normalizedValue = normalizeValue(value);

  if (isSensitiveOnlyFallbackSelection(selection)) {
    if (groupKey === 'skin_condition' && normalizedValue && normalizedValue !== 'Sensitive') {
      return {
        ...selection,
        skin_type: 'Sensitive',
        skin_condition: normalizedValue
      };
    }

    if (groupKey === 'age' || groupKey === 'skin_tone') {
      return {
        ...selection,
        skin_type: 'Sensitive',
        skin_condition: '',
        [groupKey]: normalizedValue
      };
    }
  }

  return {
    ...selection,
    [groupKey]: normalizedValue
  };
}

function buildGroupOptions(pages, selection, groupKey) {
  const values = [];
  const seen = new Set();

  for (const page of pages) {
    if (!(page.route_slug || page.page_slug) || !matchesSelection(page, selection, groupKey)) {
      continue;
    }

    const value = normalizeValue(page[groupKey]);
    if (!value || seen.has(value)) {
      continue;
    }

    const nextSelection = buildNextSelection(selection, groupKey, value);
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
  selection,
  validPages
}) {
  return (
    <>
      <div className="persona-filters__selected-head">
        <h2 className="persona-filters__selected-title">Selected</h2>
        {activeSelections.length > 0 ? (
          <a href={clearAllHref} className="persona-filters__clear">
            Clear all
          </a>
        ) : null}
      </div>

      {activeSelections.length > 0 ? (
        <div className="persona-filters__active">
          {activeSelections.map((item) => (
            <a href={item.href} className="persona-chip persona-chip--active" key={item.key}>
              <span className="persona-chip__close" aria-hidden="true">
                ×
              </span>
              <span>{item.label}</span>
            </a>
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
                  <a
                    href={option.href}
                    className={`persona-option ${option.isActive ? 'persona-option--selected' : ''}`}
                    key={`${group.key}-${option.value}`}
                  >
                    <span className="persona-option__box" aria-hidden="true">
                      {option.isActive ? '✓' : ''}
                    </span>
                    <span className="persona-option__label">{option.label}</span>
                  </a>
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
  const validPages = (pages || []).filter((page) => page?.route_slug || page?.page_slug);
  const selection = getSelection(currentPersona);
  const clearAllHref = '/sunscreens';
  const activeSelections = FILTER_GROUPS.map((group) => ({
    key: group.key,
    label: formatOptionLabel(group.key, selection[group.key]),
    href: getSelectionHref(validPages, { ...selection, [group.key]: '' })
  })).filter((item) => item.label);
  const mobileSheetId = 'persona-filter-sheet';

  return (
    <>
      <aside className="persona-filters persona-filters--desktop">
        <div className="persona-filters__sticky">
          <FiltersContent
            activeSelections={activeSelections}
            clearAllHref={clearAllHref}
            selection={selection}
            validPages={validPages}
          />
        </div>
      </aside>

      <div className="persona-filters-mobile">
        <input
          id={mobileSheetId}
          className="persona-sheet__toggle"
          type="checkbox"
          aria-hidden="true"
        />
        <label htmlFor={mobileSheetId} className="persona-filters-mobile__trigger">
          Filters
          {activeSelections.length > 0 ? (
            <span className="persona-filters-mobile__count">{activeSelections.length}</span>
          ) : null}
        </label>

        <label htmlFor={mobileSheetId} className="persona-sheet__backdrop" aria-hidden="true" />
        <div className="persona-sheet">
          <div className="persona-sheet__handle" aria-hidden="true" />
          <label htmlFor={mobileSheetId} className="persona-sheet__close" aria-label="Close filters">
            ×
          </label>
          <div className="persona-sheet__body">
            <FiltersContent
              activeSelections={activeSelections}
              clearAllHref={clearAllHref}
              selection={selection}
              validPages={validPages}
            />
          </div>
        </div>
      </div>
    </>
  );
}
