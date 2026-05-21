import { motion } from 'framer-motion';
import LoadingSpinner from '../common/LoadingSpinner';

const PinDots = ({ filledCount = 0, isError = false, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="md" text="Verifying..." />
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 py-4">
      {[0, 1, 2, 3].map((index) => {
        const isFilled = index < filledCount;
        return (
          <motion.div
            key={index}
            className={`w-4 h-4 rounded-full border-2 ${
              isError
                ? 'border-red-500 bg-red-500'
                : isFilled
                ? 'border-neutral-800 bg-neutral-800'
                : 'border-neutral-400 bg-transparent'
            }`}
            animate={
              isFilled && !isError
                ? { scale: [1, 1.3, 1] }
                : isError
                ? { x: [0, -6, 6, -6, 6, 0] }
                : {}
            }
            transition={
              isError
                ? { duration: 0.4 }
                : { duration: 0.2 }
            }
          />
        );
      })}
    </div>
  );
};

export default PinDots;
