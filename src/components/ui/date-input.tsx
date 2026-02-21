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
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    const dayRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    
    // When the external value from react-hook-form changes, update the internal state
    useEffect(() => {
      const [d = '', m = '', y = ''] = value?.split('/') || [];
      setDay(d);
      setMonth(m);
      setYear(y);
    }, [value]);

    const triggerChange = (d: string, m: string, y: string) => {
      if (onChange) {
         onChange(`${d}/${m}/${y}`);
      }
    };

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length <= 2) {
        setDay(val);
        triggerChange(val, month, year);
        if (val.length === 2 && monthRef.current) {
          monthRef.current.focus();
        }
      }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length <= 2) {
        setMonth(val);
        triggerChange(day, val, year);
        if (val.length === 2 && yearRef.current) {
          yearRef.current.focus();
        }
      }
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length <= 4) {
        setYear(val);
        triggerChange(day, month, val);
      }
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
        onClick={() => dayRef.current?.focus()}
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
          className="w-[2ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={2}
        />
        <span className="text-muted-foreground">/</span>
        <input
          ref={monthRef}
          value={month}
          onChange={handleMonthChange}
          onKeyDown={(e) => handleKeyDown(e, 'month')}
          placeholder="MM"
          className="w-[2ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={2}
        />
        <span className="text-muted-foreground">/</span>
        <input
          ref={yearRef}
          value={year}
          onChange={handleYearChange}
          onKeyDown={(e) => handleKeyDown(e, 'year')}
          placeholder="YYYY"
          className="w-[4.5ch] bg-transparent text-center outline-none placeholder:text-muted-foreground"
          maxLength={4}
        />
      </div>
    );
  }
);
DateInput.displayName = 'DateInput';