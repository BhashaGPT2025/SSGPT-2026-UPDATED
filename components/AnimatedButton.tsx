
import React from 'react';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'success' | 'danger' | 'glass';
  isLoading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  icon, 
  label, 
  variant = 'primary', 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'from-emerald-600 via-green-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50 text-white';
      case 'danger':
        return 'from-rose-600 via-red-500 to-orange-500 shadow-rose-500/30 hover:shadow-rose-500/50 text-white';
      case 'glass':
        return 'from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 shadow-lg border border-white/20 dark:border-slate-600/50 hover:border-indigo-500/50';
      case 'primary':
      default:
        return 'from-indigo-600 via-purple-600 to-violet-600 shadow-indigo-500/30 hover:shadow-indigo-500/50 text-white';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        group relative flex items-center justify-center
        rounded-full bg-gradient-to-r ${getVariantClasses()}
        h-10 pl-3 pr-3
        shadow-md
        transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)
        hover:pr-5 hover:gap-2 hover:scale-[1.02]
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale
        ${className}
      `}
      {...props}
    >
      {/* Icon Container - Rotates slightly on hover */}
      <div className={`relative z-10 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 ${isLoading ? 'animate-spin' : ''}`}>
        {icon}
      </div>

      {/* Text Container - Expands safely */}
      <div className="overflow-hidden max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap">
        <span className="text-sm font-bold ml-2">
            {isLoading ? 'Processing...' : label}
        </span>
      </div>
      
      {/* Shine effect overlay */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0 rounded-full" />
    </button>
  );
};
