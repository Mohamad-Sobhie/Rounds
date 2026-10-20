import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

interface Anchor {
  /** Wall-clock time the progress values were measured at. */
  atMs: number;
  segment: number;
  total: number;
  /** Progress per millisecond while running, 0 when paused. */
  segmentRate: number;
  totalRate: number;
}

interface ProgressRingsProps {
  size: number;
  segmentProgress: number;
  totalProgress: number;
  segmentDurationMs: number;
  totalDurationMs: number;
  running: boolean;
  color: string;
  trackColor: string;
}

const OUTER_STROKE = 6;
const INNER_STROKE = 18;
const GAP = 10;

/**
 * Inner ring: current segment. Outer ring: whole workout.
 *
 * The screen re-renders ~10 times a second; between renders the rings extrapolate on the UI thread
 * from the last measured progress, so they move smoothly at the display's frame rate.
 */
export function ProgressRings(props: ProgressRingsProps) {
  const { size, color, trackColor } = props;
  // Rates start at 0, so the initial timestamp is irrelevant until the effect below runs.
  const anchor = useSharedValue<Anchor>({
    atMs: 0,
    segment: props.segmentProgress,
    total: props.totalProgress,
    segmentRate: 0,
    totalRate: 0,
  });

  useEffect(() => {
    anchor.value = {
      atMs: Date.now(),
      segment: props.segmentProgress,
      total: props.totalProgress,
      segmentRate: props.running ? 1 / props.segmentDurationMs : 0,
      totalRate: props.running ? 1 / props.totalDurationMs : 0,
    };
  }, [
    anchor,
    props.segmentProgress,
    props.totalProgress,
    props.segmentDurationMs,
    props.totalDurationMs,
    props.running,
  ]);

  const now = useSharedValue(0);
  useFrameCallback(() => {
    now.value = Date.now();
  });

  const segmentEnd = useDerivedValue(() => {
    const a = anchor.value;
    return Math.min(1, a.segment + (now.value - a.atMs) * a.segmentRate);
  });
  const totalEnd = useDerivedValue(() => {
    const a = anchor.value;
    return Math.min(1, a.total + (now.value - a.atMs) * a.totalRate);
  });

  const { outer, inner } = useMemo(() => {
    const circle = (inset: number) => {
      const oval = Skia.XYWHRect(inset, inset, size - inset * 2, size - inset * 2);
      // Just under 360°: a full sweep would collapse to an empty arc.
      return Skia.PathBuilder.Make().arcToOval(oval, -90, 359.99, true).build();
    };
    return {
      outer: circle(OUTER_STROKE / 2),
      inner: circle(OUTER_STROKE + GAP + INNER_STROKE / 2),
    };
  }, [size]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={outer} style="stroke" strokeWidth={OUTER_STROKE} color={trackColor} />
      <Path path={outer} style="stroke" strokeWidth={OUTER_STROKE} color={color} end={totalEnd} />
      <Path path={inner} style="stroke" strokeWidth={INNER_STROKE} color={trackColor} />
      <Path path={inner} style="stroke" strokeWidth={INNER_STROKE} color={color} end={segmentEnd} />
    </Canvas>
  );
}
