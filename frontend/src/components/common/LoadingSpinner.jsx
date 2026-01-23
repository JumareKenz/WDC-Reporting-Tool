import { Loader2 } from 'lucide-react';

/**
 * Loading Spinner Component
 */
const LoadingSpinner = ({ size = 'md', text = null, fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${spinnerSize} text-primary-600 animate-spin`} />
      {text && <p className="text-sm text-neutral-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * Loading Overlay Component (for loading states on top of content)
 */
export const LoadingOverlay = ({ loading, children, text = 'Loading...' }) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton Loader Component
 */
export const Skeleton = ({ className = '', width = 'full', height = 'default' }) => {
  const widthClasses = {
    sm: 'w-1/4',
    md: 'w-1/2',
    lg: 'w-3/4',
    full: 'w-full',
  };

  const heightClasses = {
    sm: 'h-4',
    default: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
  };

  const widthClass = widthClasses[width] || width;
  const heightClass = heightClasses[height] || heightClasses.default;

  return (
    <div
      className={`${widthClass} ${heightClass} bg-neutral-200 rounded animate-pulse ${className}`}
    ></div>
  );
};

/**
 * Card Skeleton Loader
 */
export const CardSkeleton = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-neutral-200 shadow-md p-6"
        >
          <Skeleton height="lg" width="md" className="mb-4" />
          <Skeleton height="default" width="full" className="mb-2" />
          <Skeleton height="default" width="lg" className="mb-2" />
          <Skeleton height="default" width="md" />
        </div>
      ))}
    </>
  );
};

export default LoadingSpinner;
