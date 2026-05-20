import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../../utils/constants';

const LogoIcon = ({ className = '' }) => (
  <img
    src="/app-icon.png"
    alt=""
    aria-hidden="true"
    className={`${className} object-contain rounded-2xl`}
  />
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
