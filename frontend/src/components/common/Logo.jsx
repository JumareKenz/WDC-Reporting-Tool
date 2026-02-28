import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../../utils/constants';

const LogoIcon = ({ className = '' }) => (
  <svg viewBox="0 0 44 44" className={className} fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
    </defs>
    <rect width="44" height="44" rx="12" fill="url(#logoGrad)" />
    <path
      d="M22 8 L35 13 L35 24 C35 30.5 29.5 35.5 22 37 C14.5 35.5 9 30.5 9 24 L9 13 Z"
      fill="rgba(255,255,255,0.13)"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M15 24 L19.5 28.5 L29 19"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Logo = ({ size = 'default', showText = true, className = '', linkTo = '/' }) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', title: 'text-xs font-bold', subtitle: 'text-[10px]' },
    default: { icon: 'w-10 h-10', title: 'text-sm font-bold', subtitle: 'text-xs' },
    lg: { icon: 'w-14 h-14', title: 'text-lg font-bold', subtitle: 'text-sm' },
    xl: { icon: 'w-20 h-20', title: 'text-2xl font-bold', subtitle: 'text-sm' },
  };

  const s = sizes[size] || sizes.default;

  const content = (
    <div className={`flex items-center gap-3 group ${className}`}>
      <LogoIcon className={`${s.icon} drop-shadow-md group-hover:drop-shadow-lg transition-all duration-300`} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${s.title} text-neutral-900 group-hover:text-primary-700 transition-colors tracking-tight`}>
            {APP_CONFIG.APP_NAME}
          </span>
          <span className={`${s.subtitle} text-neutral-500 mt-0.5`}>
            {APP_CONFIG.APP_SUBTITLE}
          </span>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="focus:outline-none">{content}</Link>;
  }

  return content;
};

export { LogoIcon };
export default Logo;
