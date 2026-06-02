import React from 'react';

/**
 * Lightweight section container for the dashboard. 1px border + background
 * contrast instead of heavy shadows (per the design spec). Title uses the
 * subheading scale (14px medium); subtitle the label scale.
 */
const Panel = ({ title, subtitle, action, children, className = '', bodyClassName = 'p-4' }) => (
  <section className={`flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0">
          {title && <h2 className="truncate text-[14px] font-medium text-neutral-900">{title}</h2>}
          {subtitle && <p className="truncate text-[11px] uppercase tracking-[0.05em] text-neutral-400">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )}
    <div className={`flex-1 ${bodyClassName}`}>{children}</div>
  </section>
);

export default Panel;
