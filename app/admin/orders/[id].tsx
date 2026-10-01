import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { use, useState, useEffect } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { Printer, Upload, X, Trash2, ReceiptText, Route, Link2 } from "lucide-react";
import { Skeleton, SkeletonLines } from "../../../components/Skeleton";
import LifecycleGuide from "../../../components/LifecycleGuide";

export const dynamic = "force-dynamic";

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useQuery((api as any)?.orders?.getById, { id: (id as string).toLowerCase() });
  const update = useMutation((api as any)?.orders?.update, {
    variables: { id, ...params },
  });

  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState({
    customerName: order?.customerName ?? "",
    contactName: order?.contactName ?? "",
    companyName: order?.companyName ?? "",
    mobile: order?.mobile ?? "",
    branch: order?.branch ?? "",
    fulfillment: order?.fulfillment ?? "delivery",
    osNo: order?.osNo ?? "",
    invoiceNo: order?.invoiceNo ?? "",
    finalTotal: order?.finalTotal ?? 0,
    paymentMode: order?.paymentMode ?? "GCASH",
    items: order?.items ?? [],
  });

  useEffect(() => {
    if (order) {
      setFormValues({
        customerName: order.customerName ?? "",
        contactName: order.contactName ?? "",
        companyName: order.companyName ?? "",
        mobile: order.mobile ?? "",
        branch: order.branch ?? "",
        fulfillment: order.fulfillment ?? "delivery",
        osNo: order.osNo ?? "",
        invoiceNo: order.invoiceNo ?? "",
        finalTotal: order.finalTotal ?? 0,
        paymentMode: order.paymentMode ?? "GCASH",
        items: order.items ?? [],
      });
    }
  }, [order]);

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({ ...formValues });
  };

  if (!order) return (
    <div className="min-h-screen font-body">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 !rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <div className="glass-strong rounded-3xl p-6">
          <h2 className="font-bold text-slate-900">Order #{order.trackingId}</h2>
          <p className="text-sm text-slate-500 mt-1">{order.customerName} • {order.branch}</p>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} aria-label="Go back" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base font-semibold">← Back</button>
          <img src="/rf-logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <p className="font-display font-bold text-slate-900">RF FROZEN MEAT</p>
          <div className="ml-auto flex gap-2"><ThemeToggle /><a href="/" className="inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Shop</a><a href="/admin/orders" className="hidden sm:inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Orders</a></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <div className="glass-strong rounded-3xl p-6">
          <h2 className="font-bold text-slate-900">Order Details</h2>
          <p className="text-sm mt-2">Manage this order’s details</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name</label>
              <input
                type="text"
                value={formValues.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input
                type="text"
                value={formValues.contactName}
                onChange={(e) => handleChange("contactName", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={formValues.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formValues.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <select
                value={formValues.branch}
                onChange={(e) => handleChange("branch", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="stamesa">Stamesa</option>
                <option value="qc">QC</option>
                <option value="pasig">Pasig</option>
                <option value="blumentritt">Blumentritt</option>
                <option value="novaliches">Novaliches</option>
                <option value="laspinas">Laspinas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fulfillment</label>
              <select
                value={formValues.fulfillment}
                onChange={(e) => handleChange("fulfillment", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="placed">Placed</option>
                <option value="confirmed">Confirmed</option>
                <option value="to_pay">To Pay</option>
                <option value="proof_uploaded">Proof Uploaded</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="picking">Picking</option>
                <option value="checking">Checking</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OS Number</label>
              <input
                type="text"
                value={formValues.osNo}
                onChange={(e) => handleChange("osNo", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice #</label>
              <input
                type="text"
                value={formValues.invoiceNo}
                onChange={(e) => handleChange("invoiceNo", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Final Total</label>
              <input
                type="number"
                value={formValues.finalTotal}
                onChange={(e) => handleChange("finalTotal", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode</label>
              <select
                value={formValues.paymentMode}
                onChange={(e) => handleChange("paymentMode", e.target.value)}
                className="w-full rounded-xl border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
                <option value="BDO">BDO</option>
                <option value="GOTYME">GOTYME</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div>
              <h3 className="font-semibold mt-2">Items</h3>
              <ul className="space-y-2">
                {formValues.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600">{item.productName}</span>
                    <span className="w-4 h-4 rounded-full bg-green-100 text-green-600">× {item.qtyBox}</span>
                    <span className="text-xs text-slate-500">₱{item.estPrice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
              <X size={18} aria-hidden />
              <span className="hidden sm:inline">Set Final Bill</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
              <Upload size={18} aria-hidden />
              <span className="hidden sm:inline">Upload Proof</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
              <Trash2 size={18} aria-hidden />
              <span className="hidden sm:inline">Delete Proof</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
