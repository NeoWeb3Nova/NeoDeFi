import { TOKENS, type TokenSymbol } from "@/constants/tokens";

export function TokenIcon({ symbol, size = 38 }: { symbol: TokenSymbol; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full text-[9px] font-extrabold text-white shadow-sm" style={{ width: size, height: size, background: TOKENS[symbol].color }} aria-hidden="true">{symbol}</span>;
}
