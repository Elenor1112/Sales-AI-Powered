export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#222a3d",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.75rem",
    color: "#dae2fd",
  },
  labelStyle: { color: "#c7c4d7" },
  itemStyle: { color: "#dae2fd" },
} as const;

export const CHART_LEGEND_STYLE = {
  wrapperStyle: { color: "#c7c4d7", fontSize: 13 },
} as const;

export const CHART_AXIS_TICK = { fill: "#c7c4d7", fontSize: 12 } as const;

export const CHART_COLORS = {
  primary: "#c0c1ff",
  secondary: "#fbabff",
  tertiary: "#4edea3",
  primaryContainer: "#8083ff",
  secondaryContainer: "#ae05c6",
  error: "#ffb4ab",
} as const;
