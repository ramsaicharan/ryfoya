'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

function getMatchStatus(matchPercent) {
  if (matchPercent > 80) {
    return 'good';
  }

  if (matchPercent >= 50) {
    return 'warning';
  }

  return 'bad';
}

export default function SkinMatchTabs({ matches }) {
  const safeMatches = useMemo(() => matches || [], [matches]);
  const [activeId, setActiveId] = useState(safeMatches[0]?.id || '');
  const activeMatch =
    safeMatches.find((match) => match.id === activeId) || safeMatches[0] || null;

  if (!activeMatch) {
    return null;
  }

  const status = getMatchStatus(activeMatch.matchPercent);

  return (
    <div className="skin-tabs">
      <div className="skin-tabs__chips" role="tablist" aria-label="Skin type matches">
        {safeMatches.map((match) => (
          <button
            key={match.id}
            type="button"
            role="tab"
            aria-selected={match.id === activeMatch.id}
            className={`skin-tab__label ${match.id === activeMatch.id ? 'skin-tab__label--active' : ''}`}
            onClick={() => setActiveId(match.id)}
          >
            {match.tabLabel}
          </button>
        ))}
      </div>

      <div className={`skin-tab__panel skin-tab__panel--${status}`} role="tabpanel">
        <div className="skin-tab__panel-top">
          <div className="skin-tab__ring">
            <svg className="skin-tab__ring-svg" viewBox="0 0 36 36" aria-hidden="true">
              <path
                className="skin-tab__ring-track"
                strokeWidth="4"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`skin-tab__ring-fill skin-tab__ring-fill--${status}`}
                strokeWidth="4"
                strokeDasharray={`${activeMatch.matchPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="skin-tab__ring-text">{activeMatch.matchPercent}%</span>
          </div>
          <p className="skin-tab__quote">{activeMatch.labels.join(' · ')}</p>
        </div>

        <div className="skin-tab__lists">
          <div>
            <div className="skin-tab__list-title skin-tab__list-title--pro">Pros</div>
            <ul className="skin-tab__list">
              {activeMatch.pros.map((pro, idx) => (
                <li key={`${activeMatch.id}-pro-${idx}`}>{pro}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="skin-tab__list-title skin-tab__list-title--con">Cons</div>
            <ul className="skin-tab__list">
              {activeMatch.cons.map((con, idx) => (
                <li key={`${activeMatch.id}-con-${idx}`}>{con}</li>
              ))}
            </ul>
          </div>
        </div>

        {activeMatch.pageSlug ? (
          <Link href={`/${activeMatch.pageSlug}`} className="skin-tab__link">
            View skin-context page
          </Link>
        ) : null}
      </div>
    </div>
  );
}
