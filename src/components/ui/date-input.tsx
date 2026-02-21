'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
}

export const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, id }, ref) => {
    // Initialize internal state from the `value` prop.
    const [day, setDay] = useState(() => value?.split('/')[0] || '');
    const [month, setMonth] = useState(() => value?.split('/')[1] || '');
    const [year, setYear] = useState(() => value?.split('/')[2] || '');

    const dayRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    
    // This effect synchronizes the component's internal state if the `value`
    // prop is changed externally (e.g., by a form reset or pre-filling).
    useEffect(() => {
      const [d = '', m = '', y = ''] = value?.split('/') || [];
      setDay(d);
      setMonth(m);
      setYear(y);
    }, [value]);
    
    // We only notify the parent form when the user leaves the input group.
    const handleBlur = () => {
      if (onChange) {
        onChange(`${day}/${month}/${year}`);
      }
    };

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      setDay(val);
      if (val.length === 2) {
        // Defer focus change to prevent race condition
        setTimeout(() => monthRef.current?.focus(), 0);
      }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      setMonth(val);
      if (val.length === 2) {
        // Defer focus change to prevent race condition
        setTimeout(() => yearRef.current?.focus(), 0);
      }
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      setYear(val);
    };

    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      part: 'day' | 'month' | 'year'
    ) => {
      if (e.key === 'Backspace') {
        if (part === 'year' && year.length === 0 && monthRef.current) {
          monthRef.current.focus();
        } else if (part === 'month' && month.length === 0 && dayRef.current) {
          dayRef.current.focus();
        }
      }
    };

    return (
      <div
        ref={ref}
        id={id}
        onBlur={handleBlur} // Attach blur handler to the container
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm",
          className
        )}
      >
        <input
          ref={dayRef}
          value={day}
          onChange={handleDayChange}
          onKeyDown={(e) => handleKeyDown(e, 'day')}
          placeholder="DD"
          className="w-[3ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={2}
        />
        <span className="text-muted-foreground">/</span>
        <input
          ref={monthRef}
          value={month}
          onChange={handleMonthChange}
          onKeyDown={(e) => handleKeyDown(e, 'month')}
          placeholder="MM"
          className="w-[3ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={2}
        />
        <span className="text-muted-foreground">/</span>
        <input
          ref={yearRef}
          value={year}
          onChange={handleYearChange}
          onKeyDown={(e) => handleKeyDown(e, 'year')}
          placeholder="YYYY"
          className="w-[5ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={4}
        />
      </div>
    );
  }
);
DateInput.displayName = 'DateInput';
