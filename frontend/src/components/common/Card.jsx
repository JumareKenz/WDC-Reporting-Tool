/**
 * Reusable Card Component
 */
const Card = ({
  children,
  title = null,
  subtitle = null,
  action = null,
  footer = null,
  hoverable = false,
  className = '',
  padding = 'default',
  ...props
}) => {
  // Padding variants
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };

  const cardPadding = paddingStyles[padding] || paddingStyles.default;

  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-200 shadow-md
        transition-shadow duration-200
        ${hoverable ? 'hover:shadow-lg cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Header */}
      {(title || action) && (
        <div className={`flex items-start justify-between border-b border-neutral-200 ${cardPadding}`}>
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-neutral-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className={title || action ? cardPadding : `${cardPadding}`}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={`border-t border-neutral-200 ${cardPadding} bg-neutral-50 rounded-b-xl`}>
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Card with icon variant
 */
export const IconCard = ({
  icon: Icon,
  iconColor = 'primary',
  title,
  value,
  subtitle = null,
  trend = null,
  className = '',
  ...props
}) => {
  const iconColorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
    neutral: 'bg-neutral-100 text-neutral-600',
  };

  const iconColorClass = iconColorClasses[iconColor] || iconColorClasses.primary;

  return (
    <Card className={className} {...props}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${iconColorClass}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {trend}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * Empty state card
 */
export const EmptyCard = ({
  icon: Icon,
  title,
  description,
  action = null,
  className = '',
}) => {
  return (
    <Card className={className} padding="lg">
      <div className="text-center">
        {Icon && (
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-neutral-100">
            <Icon className="w-8 h-8 text-neutral-400" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
        {description && (
          <p className="text-neutral-600 mb-4 max-w-md mx-auto">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </Card>
  );
};

export default Card;
