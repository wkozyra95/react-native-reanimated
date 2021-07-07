import { EasingFn } from '../Easing';
import { AnimatedStyle, StyleProps } from '../commonTypes';

export type PrimitiveValue = number | string;

// TODO: maybe each type of animation should have own type of animation inherited from interface, and animated utils should use just these interface
export interface Animation {
  type?: string;
  onFrame: (animation?: Animation, timestamp?: Timestamp) => boolean; // TODO
  onStart: (
    nextAnimation: Animation,
    current: number, // TODO
    timestamp: Timestamp,
    previousAnimation: Animation
  ) => void; // TODO
  startValue?: number; // TODO number | string (?)
  toValue?: number; // TODO number | string (?)
  current?:
    | number
    | StyleProps
    | AnimatedStyle
    | unknown
    | Record<string, unknown>; // TODO
  callback?: AnimationCallback;
  isHigherOrder?: boolean; // TODO
  startTime?: number; // TODO
  easing?: EasingFn; // TODO
  lastTimestamp?: number; // TODO
  velocity?: number; // TODO
  startTimestamp?: number; // TODO
  initialVelocity?: number; // TODO
  started?: boolean; // TODO
  previousAnimation?: Animation; // TODO
  reps?: number; // TODO
  finished?: boolean; // TODO
  animationIndex?: number; // TODO
  styleAnimations?: AnimatedStyle; // TODO
  value?: unknown; // TODO
  __prefix?: string;
  __suffix?: string;
}

export interface AnimationConfig {
  tmp?: unknown;
} // TODO

export type AnimationCallback = (
  finished?: boolean,
  tmpValue?: number
) => unknown; // TODO animation is not needed everywhere

export type NextAnimation = Animation | (() => Animation);

export type SharedValue = {
  // TODO: just temporary mock
  value: unknown;
};

export type AnimationOnFrame = (animation: Animation, now: number) => boolean;
export type Timestamp = number;
