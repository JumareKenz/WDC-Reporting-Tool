import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Building2 } from 'lucide-react';
import Logo from '../components/common/Logo';
import { APP_CONFIG } from '../utils/constants';

const LoginChooser = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white flex flex-col items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6">
          <Logo size="xl" showText={false} linkTo={null} />
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-1 text-center">
          {APP_CONFIG.APP_NAME}
        </h1>
        <p className="text-base text-neutral-500 mb-10 text-center">
          {APP_CONFIG.APP_SUBTITLE}
        </p>

        {/* Login options */}
        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={() => navigate('/login/secretary')}
            className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
            style={{ minHeight: 64 }}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-700" />
            </div>
            <div className="text-left">
              <span className="text-xl font-semibold text-neutral-900 block">
                Ward Secretary
              </span>
              <span className="text-sm text-neutral-500">
                Log in with your ward PIN
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login/official')}
            className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
            style={{ minHeight: 64 }}
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-neutral-600" />
            </div>
            <div className="text-left">
              <span className="text-xl font-semibold text-neutral-900 block">
                LGA / State Official
              </span>
              <span className="text-sm text-neutral-500">
                Log in with email &amp; password
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-neutral-400">
            {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginChooser;
