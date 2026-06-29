import { TOKENS, type TokenSymbol } from "@/constants/tokens";

export function TokenIcon({ symbol, size = 38 }: { symbol: TokenSymbol; size?: number }) {
  return <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 text-[8px] font-extrabold text-white shadow-[0_6px_18px_rgba(0,0,0,.25)]" style={{ width: size, height: size, background: `radial-gradient(circle at 30% 22%, rgba(255,255,255,.28), transparent 28%), ${TOKENS[symbol].color}` }} aria-hidden="true"><span className="absolute inset-[3px] rounded-full border border-white/10"/>{symbol}</span>;
}
