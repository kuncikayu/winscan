interface WinscanLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}
export default function WinscanLogo({ size = 'md', animated = false, className = '' }: WinscanLogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };
  return (
    <div className={`${sizes[size]} ${className} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="wGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="url(#bgGradient)" 
          stroke="url(#wGradient)" 
          strokeWidth="1"
          className={animated ? 'animate-pulse' : ''}
        />
        <g transform="translate(50, 50)">
          <path
            d="M -20 -15 L -15 10 L -10 -5 L -5 10"
            stroke="url(#wGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className={animated ? 'animate-pulse' : ''}
          />
          <path
            d="M -5 10 L 0 -5 L 5 10 L 10 -15"
            stroke="url(#wGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className={animated ? 'animate-pulse' : ''}
          />
        </g>
        <g opacity="0.6">
          <line 
            x1="25" 
            y1="35" 
            x2="75" 
            y2="35" 
            stroke="url(#scanGradient)" 
            strokeWidth="1.5"
            strokeLinecap="round"
            className={animated ? 'animate-pulse' : ''}
          />
          <line 
            x1="25" 
            y1="50" 
            x2="75" 
            y2="50" 
            stroke="url(#scanGradient)" 
            strokeWidth="1.5"
            strokeLinecap="round"
            className={animated ? 'animate-pulse' : ''}
            style={{ animationDelay: '0.2s' }}
          />
          <line 
            x1="25" 
            y1="65" 
            x2="75" 
            y2="65" 
            stroke="url(#scanGradient)" 
            strokeWidth="1.5"
            strokeLinecap="round"
            className={animated ? 'animate-pulse' : ''}
            style={{ animationDelay: '0.4s' }}
          />
        </g>
        <g stroke="#3b82f6" strokeWidth="2" opacity="0.4" strokeLinecap="round">
          <path d="M 15 25 L 15 15 L 25 15" />
          <path d="M 75 15 L 85 15 L 85 25" />
          <path d="M 15 75 L 15 85 L 25 85" />
          <path d="M 75 85 L 85 85 L 85 75" />
        </g>
        <circle 
          cx="50" 
          cy="75" 
          r="2" 
          fill="#3b82f6"
          className={animated ? 'animate-pulse' : ''}
        >
          {animated && (
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>
      {animated && (
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
      )}
    </div>
  );
}
