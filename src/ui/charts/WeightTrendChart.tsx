/**
 * Gráfico de tendencia de peso.
 *
 * Tres capas visuales (de fondo a primer plano):
 * 1. Banda de no preocupación — área coloreada alrededor de la línea suavizada.
 *    Representa "fluctuación normal"; mediciones dentro de la banda no requieren
 *    acción.
 * 2. Línea suavizada (EMA) — la "señal".
 * 3. Puntos crudos — el "ruido" diario.
 *
 * Justificación brief: Pilar 4, "una sola forma de visualizar incertidumbre,
 * consistente (banda gris alrededor de línea de tendencia)".
 */

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { SmoothedWeightPoint } from '@/core/model/types';
import { colors, fontSizes } from '../theme';

const PADDING = { top: 20, right: 12, bottom: 28, left: 36 };

interface Props {
  points: readonly SmoothedWeightPoint[];
  /** Ancho de banda en kg, simétrico alrededor de la línea suavizada. */
  bandKg: number;
  width: number;
  height: number;
}

interface Domain {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function computeDomain(points: readonly SmoothedWeightPoint[], bandKg: number): Domain {
  const xs = points.map((p) => p.date.getTime());
  const ys = points.flatMap((p) => [p.rawKg, p.smoothedKg]);
  const minXBase = Math.min(...xs);
  const maxXBase = Math.max(...xs);
  const xRange = maxXBase - minXBase || 1;

  const minYBase = Math.min(...ys) - bandKg;
  const maxYBase = Math.max(...ys) + bandKg;
  const yPad = (maxYBase - minYBase) * 0.1 || 1;

  return {
    minX: minXBase - xRange * 0.02,
    maxX: maxXBase + xRange * 0.02,
    minY: minYBase - yPad,
    maxY: maxYBase + yPad,
  };
}

function buildScale(
  domain: Domain,
  width: number,
  height: number,
): { x: (t: number) => number; y: (kg: number) => number } {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const xRange = domain.maxX - domain.minX || 1;
  const yRange = domain.maxY - domain.minY || 1;
  return {
    x: (t) => PADDING.left + ((t - domain.minX) / xRange) * plotW,
    y: (kg) => PADDING.top + plotH - ((kg - domain.minY) / yRange) * plotH,
  };
}

function buildLinePath(
  points: readonly SmoothedWeightPoint[],
  scale: ReturnType<typeof buildScale>,
  accessor: (p: SmoothedWeightPoint) => number,
): string {
  return points
    .map((p, i) => {
      const x = scale.x(p.date.getTime());
      const y = scale.y(accessor(p));
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildBandPath(
  points: readonly SmoothedWeightPoint[],
  scale: ReturnType<typeof buildScale>,
  bandKg: number,
): string {
  if (points.length === 0) return '';
  const top = points
    .map((p, i) => {
      const x = scale.x(p.date.getTime());
      const y = scale.y(p.smoothedKg + bandKg);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  const bottom = [...points]
    .reverse()
    .map((p) => {
      const x = scale.x(p.date.getTime());
      const y = scale.y(p.smoothedKg - bandKg);
      return `L${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  return `${top} ${bottom} Z`;
}

function formatKg(kg: number): string {
  return kg.toFixed(1);
}

function formatMonthDay(d: Date): string {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function WeightTrendChart({ points, bandKg, width, height }: Props) {
  const domain = useMemo(() => computeDomain(points, bandKg), [points, bandKg]);
  const scale = useMemo(() => buildScale(domain, width, height), [domain, width, height]);

  if (points.length === 0) {
    return (
      <View
        style={{
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgText fill={colors.textMuted}>Sin datos todavía</SvgText>
      </View>
    );
  }

  const bandPath = buildBandPath(points, scale, bandKg);
  const smoothedPath = buildLinePath(points, scale, (p) => p.smoothedKg);

  const yTickValues = [domain.minY, (domain.minY + domain.maxY) / 2, domain.maxY];
  const xTickIndices =
    points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <Svg width={width} height={height}>
      {/* Plot background */}
      <Rect
        x={PADDING.left}
        y={PADDING.top}
        width={width - PADDING.left - PADDING.right}
        height={height - PADDING.top - PADDING.bottom}
        fill={colors.bgMuted}
        rx={6}
      />

      {/* Y-axis labels */}
      {yTickValues.map((kg, i) => (
        <SvgText
          key={i}
          x={PADDING.left - 6}
          y={scale.y(kg) + 4}
          fontSize={fontSizes.xs}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {formatKg(kg)}
        </SvgText>
      ))}

      {/* X-axis labels */}
      {xTickIndices.map((i) => {
        const p = points[i]!;
        return (
          <SvgText
            key={i}
            x={scale.x(p.date.getTime())}
            y={height - PADDING.bottom + 16}
            fontSize={fontSizes.xs}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {formatMonthDay(p.date)}
          </SvgText>
        );
      })}

      {/* Banda de no preocupación */}
      <Path d={bandPath} fill={colors.uncertainty} opacity={0.5} />

      {/* Línea EMA */}
      <Path
        d={smoothedPath}
        stroke={colors.primary}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos crudos */}
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={scale.x(p.date.getTime())}
          cy={scale.y(p.rawKg)}
          r={p.isOutlier ? 4 : 3}
          fill={p.isOutlier ? colors.warning : colors.textMuted}
          opacity={p.isOutlier ? 1 : 0.7}
        />
      ))}
    </Svg>
  );
}
