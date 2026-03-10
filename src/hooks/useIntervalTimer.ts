import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Speech from 'expo-speech';

// --- Types ---

export type IntervalPhase = 'warmup' | 'run' | 'rest' | 'cooldown' | 'complete';

export type IntervalConfig = {
  runDuration: number;       // seconds
  restDuration: number;      // seconds
  intervals: number;         // number of run/rest cycles
  warmupDuration: number;    // seconds (0 = skip)
  cooldownDuration: number;  // seconds (0 = skip)
};

export type IntervalTimerState = {
  currentPhase: IntervalPhase;
  phaseTimeRemaining: number;
  currentInterval: number;
  totalIntervals: number;
  totalElapsed: number;
  totalDuration: number;
  isComplete: boolean;
  isRunning: boolean;
};

export const DEFAULT_INTERVAL_CONFIG: IntervalConfig = {
  runDuration: 60,
  restDuration: 30,
  intervals: 5,
  warmupDuration: 0,
  cooldownDuration: 0,
};

// --- Helpers ---

/** Calculate total workout duration from config */
export function getTotalDuration(config: IntervalConfig): number {
  if (config.intervals <= 0) {
    return config.warmupDuration + config.cooldownDuration;
  }
  return (
    config.warmupDuration +
    config.intervals * config.runDuration +
    (config.intervals - 1) * config.restDuration +
    config.cooldownDuration
  );
}

/** Format seconds into a human-readable string like "5m 30s" */
export function formatTotalTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// --- Build the phase schedule ---

type PhaseEntry = {
  phase: IntervalPhase;
  duration: number;
  interval: number; // which interval number (1-based, 0 for warmup/cooldown)
};

function buildSchedule(config: IntervalConfig): PhaseEntry[] {
  const schedule: PhaseEntry[] = [];

  if (config.warmupDuration > 0) {
    schedule.push({ phase: 'warmup', duration: config.warmupDuration, interval: 0 });
  }

  for (let i = 1; i <= config.intervals; i++) {
    schedule.push({ phase: 'run', duration: config.runDuration, interval: i });
    // No rest after the last interval
    if (i < config.intervals && config.restDuration > 0) {
      schedule.push({ phase: 'rest', duration: config.restDuration, interval: i });
    }
  }

  if (config.cooldownDuration > 0) {
    schedule.push({ phase: 'cooldown', duration: config.cooldownDuration, interval: 0 });
  }

  return schedule;
}

// --- Announce phase changes ---

function announcePhase(phase: IntervalPhase, interval: number, totalIntervals: number) {
  let message = '';
  switch (phase) {
    case 'warmup':
      message = 'Warm up!';
      break;
    case 'run':
      message = `Run! Interval ${interval} of ${totalIntervals}`;
      break;
    case 'rest':
      message = 'Rest!';
      break;
    case 'cooldown':
      message = 'Cool down!';
      break;
    case 'complete':
      message = 'Workout complete! Great job!';
      break;
  }
  if (message) {
    try {
      Speech.speak(message, { rate: 1.0, pitch: 1.0 });
    } catch {
      // Speech not available
    }
  }
}

function vibrateForPhase(phase: IntervalPhase) {
  if (Platform.OS === 'web') return;
  try {
    switch (phase) {
      case 'run':
        // Double vibrate for run
        Vibration.vibrate([0, 300, 100, 300]);
        break;
      case 'rest':
        // Single long vibrate for rest
        Vibration.vibrate(500);
        break;
      case 'warmup':
      case 'cooldown':
        Vibration.vibrate(200);
        break;
      case 'complete':
        Vibration.vibrate([0, 200, 100, 200, 100, 400]);
        break;
    }
  } catch {
    // Vibration not available
  }
}

// --- Hook ---

export function useIntervalTimer(
  config: IntervalConfig,
  active: boolean,
  paused: boolean,
  hapticEnabled: boolean = true,
) {
  const schedule = useRef<PhaseEntry[]>([]);
  const phaseIndex = useRef(0);
  const phaseRemaining = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [state, setState] = useState<IntervalTimerState>({
    currentPhase: 'warmup',
    phaseTimeRemaining: 0,
    currentInterval: 0,
    totalIntervals: config.intervals,
    totalElapsed: 0,
    totalDuration: getTotalDuration(config),
    isComplete: false,
    isRunning: false,
  });

  // Initialize / reset schedule when config changes or when becoming active
  const initialize = useCallback(() => {
    const sched = buildSchedule(config);
    schedule.current = sched;
    phaseIndex.current = 0;
    const first = sched[0];
    if (first) {
      phaseRemaining.current = first.duration;
      setState({
        currentPhase: first.phase,
        phaseTimeRemaining: first.duration,
        currentInterval: first.phase === 'run' ? first.interval : 0,
        totalIntervals: config.intervals,
        totalElapsed: 0,
        totalDuration: getTotalDuration(config),
        isComplete: false,
        isRunning: true,
      });
      announcePhase(first.phase, first.interval, config.intervals);
      if (hapticEnabled) vibrateForPhase(first.phase);
    }
  }, [config, hapticEnabled]);

  // Start the timer when becoming active
  useEffect(() => {
    if (active) {
      initialize();
    } else {
      // Reset when not active
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick every second
  useEffect(() => {
    if (!active || paused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.isComplete) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
          }
          return prev;
        }

        const newRemaining = phaseRemaining.current - 1;

        if (newRemaining <= 0) {
          // Move to next phase
          const nextIdx = phaseIndex.current + 1;
          if (nextIdx >= schedule.current.length) {
            // Workout complete
            phaseIndex.current = nextIdx;
            phaseRemaining.current = 0;
            announcePhase('complete', 0, config.intervals);
            if (hapticEnabled) vibrateForPhase('complete');
            return {
              ...prev,
              currentPhase: 'complete',
              phaseTimeRemaining: 0,
              totalElapsed: prev.totalDuration,
              isComplete: true,
              isRunning: false,
            };
          }

          const nextPhase = schedule.current[nextIdx];
          phaseIndex.current = nextIdx;
          phaseRemaining.current = nextPhase.duration;
          announcePhase(nextPhase.phase, nextPhase.interval, config.intervals);
          if (hapticEnabled) vibrateForPhase(nextPhase.phase);

          return {
            ...prev,
            currentPhase: nextPhase.phase,
            phaseTimeRemaining: nextPhase.duration,
            currentInterval: nextPhase.phase === 'run' || nextPhase.phase === 'rest'
              ? nextPhase.interval
              : prev.currentInterval,
            totalElapsed: prev.totalElapsed + 1,
          };
        }

        phaseRemaining.current = newRemaining;
        return {
          ...prev,
          phaseTimeRemaining: newRemaining,
          totalElapsed: prev.totalElapsed + 1,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [active, paused, config.intervals, hapticEnabled]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    phaseIndex.current = 0;
    phaseRemaining.current = 0;
    setState({
      currentPhase: 'warmup',
      phaseTimeRemaining: 0,
      currentInterval: 0,
      totalIntervals: config.intervals,
      totalElapsed: 0,
      totalDuration: getTotalDuration(config),
      isComplete: false,
      isRunning: false,
    });
  }, [config]);

  return { ...state, reset };
}
