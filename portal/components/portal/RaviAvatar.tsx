interface RaviAvatarProps {
  size?: number;
}

/**
 * Ravi — a bolha de diálogo azul do logo da Ravila's English,
 * isolada como personagem do portal do aluno.
 *
 * O SVG usa os mesmos dados do Logo.tsx, mas com viewBox recortado
 * para exibir apenas a bolha azul + sorriso.
 */
export function RaviAvatar({ size = 40 }: RaviAvatarProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="83 78 57 50"
      aria-label="Ravi"
    >
      {/* Bolha azul (extraída do logo — mesma path, mesma transform) */}
      <g fill="#2daae1" transform="matrix(-0.84913594,0,0,0.92789463,217.50095,32.877517)">
        <rect width="55.26598" height="39.300247" x="96.586075" y="53.218533" ry="10.901098" />
        <path d="m 151.72924,70.658017 c 0,0 3.6844,46.914673 -18.91324,21.860761" />
      </g>

      {/* Sorriso (extraído do logo — fill branco para contraste sobre o azul) */}
      <path
        fill="white"
        transform="matrix(1.2707594,0,0,0.81109679,-34.179582,74.539297)"
        d="m 71.231704,26.036416 c 0.868553,-0.294355 2.114936,0.9531 3.97076,2.81135 1.84202,1.844428 4.401524,4.349479 7.867097,6.304987 3.384853,1.920603 7.737202,3.350231 12.416798,3.356395 0.103398,4.35e-4 0.206993,1.64e-4 0.310774,-8.17e-4 4.541307,-0.04289 8.773227,-1.414299 12.099797,-3.285963 5.76807,-3.226913 8.9584,-7.92577 10.937,-9.301674 0.49271,-0.342979 0.91822,-0.489288 1.27746,-0.375538 0.35643,0.112862 0.62916,0.481066 0.7862,1.098234 0.56083,2.211172 -0.51216,9.611031 -7.95674,15.727834 -4.23759,3.469645 -10.17849,6.043259 -17.038954,6.120061 -0.155469,0.0017 -0.310795,0.0022 -0.465958,0.0013 -7.083864,-0.0534 -13.159405,-2.771172 -17.402136,-6.353435 -4.30455,-3.646941 -6.439396,-7.87212 -7.247956,-10.882531 -0.825781,-3.074529 -0.373664,-4.942467 0.445858,-5.220205 z"
      />
    </svg>
  );
}
