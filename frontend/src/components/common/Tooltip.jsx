import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Tooltip Component
 *
 * Usage:
 *   <Tooltip text="Enter the total number of people who attended." />
 *
 * Renders a help icon that shows a tooltip on hover / focus.
 * Fully keyboard accessible and screen-reader friendly.
 */
const Tooltip = ({
  text,
  position = 'top',
  icon: Icon = HelpCircle,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        aria-label={`Help: ${text}`}
        aria-describedby={visible ? 'tooltip-desc' : undefined}
        className="text-neutral-400 hover:text-primary-600 focus:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-full"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </button>

      {visible && (
        <span
          id="tooltip-desc"
          role="tooltip"
          className={`absolute z-50 w-56 px-3 py-2 text-xs text-white bg-neutral-900 rounded-lg shadow-lg pointer-events-none
            ${positionClasses[position] || positionClasses.top}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
