import {
  ShoppingCart, CircleCheck, Wallet, Upload, ShieldCheck,
  Package, ClipboardCheck, Truck, Flag,
} from "lucide-react";

export const STAGES = [
  { id: "placed", label: "Order placed", desc: "Customer orders in the shop", icon: ShoppingCart, color: "bg-slate-500" },
  { id: "confirmed", label: "Confirmed", desc: "Biller confirms item is available", icon: CircleCheck, color: "bg-sky-500" },
  { id: "to_pay", label: "Final bill set", desc: "Biller sets final amount + payment details", icon: Wallet, color: "bg-amber-500" },
  { id: "proof_uploaded", label: "Proof uploaded", desc: "Customer pays and uploads screenshot/photo", icon: Upload, color: "bg-violet-500" },
  { id: "payment_verified", label: "Payment verified", desc: "Biller verifies — money is now PAID", icon: ShieldCheck, color: "bg-emerald-500" },
  { id: "picking", label: "Picking", desc: "Inventory picks items by catchweight", icon: Package, color: "bg-orange-500" },
  { id: "checking", label: "Checking", desc: "Checker verifies boxes and kilos", icon: ClipboardCheck, color: "bg-cyan-600" },
  { id: "dispatched", label: "Dispatched", desc: "Rider / truck leaves the branch", icon: Truck, color: "bg-indigo-500" },
  { id: "delivered", label: "Delivered", desc: "Customer receives goods", icon: Flag, color: "bg-green-600" },
];

export function isPaid(status: string) {
  return ["payment_verified", "picking", "checking", "dispatched", "delivered"].includes(status);
}

export default function LifecycleGuide({ current }: { current?: string }) {
  const idx = current ? STAGES.findIndex((s) => s.id === current) : -1;
  return (
    <ol className="relative space-y-0" aria-label="Order lifecycle">
      {STAGES.map((s, i) => {
        const done = idx >= 0 ? i < idx : false;
        const here = idx >= 0 ? i === idx : false;
        const todo = idx >= 0 ? i > idx : false;
        const showMoneyDivider = s.id === "payment_verified";
        return (
          <li key={s.id}>
            {showMoneyDivider && (
              <div className="ml-5 border-l-2 border-dashed border-emerald-400/60 pl-5 pb-1 pt-1 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                Money in hand from here — above is still to collect (credit)
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow transition ${here ? "ring-4 ring-offset-2 ring-red-400 scale-110 " + s.color : done ? s.color + " opacity-100" : "bg-slate-300 dark:bg-white/15 text-slate-500"}`} aria-hidden>
                  <s.icon size={19} />
                </span>
                {i < STAGES.length - 1 && (
                  <span className={`my-0.5 w-0.5 flex-1 min-h-5 rounded ${done || here ? "bg-gradient-to-b from-emerald-400 to-sky-400" : "bg-slate-300/70 dark:bg-white/15"}`} aria-hidden />
                )}
              </div>
              <div className={`pb-4 pt-1 ${todo && idx >= 0 ? "opacity-45" : ""}`}>
                <p className={`text-base font-bold leading-tight ${here ? "text-red-800 dark:text-amber-200" : ""}`}>
                  {i + 1}. {s.label}
                  {here && <span className="ml-2 rounded-full bg-red-800 dark:bg-amber-200 dark:text-red-950 px-2 py-0.5 text-xs font-bold text-white align-middle">YOU ARE HERE</span>}
                </p>
                <p className="text-sm opacity-70">{s.desc}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
