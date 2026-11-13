import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface TabIconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

const stroke = 1.75;

export function ScheduleIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.25"
        y="4.75"
        width="17.5"
        height="16"
        rx="2.5"
        stroke={color}
        strokeWidth={stroke}
      />
      <Path
        d="M3.25 9.5h17.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <Path
        d="M8 3.25v3M16 3.25v3"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <Path
        d="M8 13h2.5M13.5 13H16M8 16.5h2.5M13.5 16.5H16"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IncomeIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 9.5h15A1.5 1.5 0 0 1 21 11v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V11a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke={color}
        strokeWidth={stroke}
      />
      <Path
        d="M3 12.25h18"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="15.75" r="1.35" fill={color} />
      <Path
        d="M7.5 9.5V7.75A4.5 4.5 0 0 1 12 3.25a4.5 4.5 0 0 1 4.5 4.5V9.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AccountIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.75" stroke={color} strokeWidth={stroke} />
      <Path
        d="M5.25 19.25c.9-3.2 3.35-4.75 6.75-4.75s5.85 1.55 6.75 4.75"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}
