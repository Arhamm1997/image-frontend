import { motion } from 'motion/react';
import { FileStatus } from './types';

interface ProgressBarProps {
  progress: number;
  status: FileStatus;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  return (
    <div className="w-full bg-white shadow-md">
      <div className="h-1 bg-gray-100 relative overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className={`h-full ${
            status === 'completed'
              ? 'bg-green-500'
              : status === 'error'
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
          }`}
        />
        {status === 'converting' && (
          <motion.div
            animate={{ x: ['0%', '100%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 left-0 w-20 h-full bg-white/30"
          />
        )}
      </div>
    </div>
  );
}
