import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endDate: string;
  className?: string;
  onEnd?: () => void;
}

const calculateTimeLeft = (endDate: string) => {
  const difference = +new Date(endDate) - +new Date();
  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return { timeLeft, hasEnded: difference <= 0 };
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endDate, className, onEnd }) => {
  const [{ timeLeft, hasEnded }, setTimeState] = useState(calculateTimeLeft(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newState = calculateTimeLeft(endDate);
      setTimeState(newState);
      if (newState.hasEnded) {
        clearInterval(timer);
        if (onEnd) onEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onEnd]);

  if (hasEnded) {
    return <span className={`font-bold text-red-500 ${className}`}>Offer Expired</span>;
  }

  return (
    <div className={`flex items-center space-x-2 text-center ${className}`}>
      {Object.entries(timeLeft).map(([interval, value]) => (
        <div key={interval} className="flex flex-col items-center">
          <span className="text-lg font-bold leading-none">{String(value).padStart(2, '0')}</span>
          <span className="text-xs uppercase opacity-75">{interval}</span>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;