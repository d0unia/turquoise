export default function Mascot({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Turquoise mascot"
    >
      {/* Wings */}
      <path d="M4.5 14 C2 12 1 9 3 7.5 C4.5 6.5 6 8 6 10Z" fill="#C8D8E0" opacity="0.9" />
      <path d="M21.5 14 C24 12 25 9 23 7.5 C21.5 6.5 20 8 20 10Z" fill="#C8D8E0" opacity="0.9" />
      {/* Body */}
      <ellipse cx="13" cy="14.5" rx="8.5" ry="7" fill="#E8E6DD" />
      {/* Eyes white */}
      <ellipse cx="10" cy="13.5" rx="2.2" ry="2.2" fill="white" />
      <ellipse cx="16" cy="13.5" rx="2.2" ry="2.2" fill="white" />
      {/* Pupils */}
      <ellipse cx="10" cy="13.5" rx="1.4" ry="1.4" fill="#2C2C2A" />
      <ellipse cx="16" cy="13.5" rx="1.4" ry="1.4" fill="#2C2C2A" />
      {/* Eye shine */}
      <ellipse cx="10.5" cy="13" rx="0.45" ry="0.45" fill="white" />
      <ellipse cx="16.5" cy="13" rx="0.45" ry="0.45" fill="white" />
      {/* Smile */}
      <path d="M10.5 17.5 Q13 19 15.5 17.5" stroke="#B4B2A9" strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </svg>
  )
}
