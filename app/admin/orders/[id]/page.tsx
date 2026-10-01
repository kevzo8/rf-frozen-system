"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { use, useState, useEffect } from "react";
import { getToken } from "../../../../lib/auth-token";
import ThemeToggle from "../../../../components/ThemeToggle";
import { X } from "lucide-react";
import { Skeleton } from "../../../../components/Skeleton";

export const dynamic = "force-dynamic";

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  const order = useQuery((api as any)?.orders?.getById, token ? { token, id: id.toLowerCase() } : "skip");
  const updateOrder = useMutation((api as any)?.orders?.updateOrder);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  // Sync form state when order loads
  useEffect(() => {
    if (order && !editing) {
      setForm({
        customerName: order.customerName ?? "",
        contactName: order.contactName ?? "",
        companyName: order.companyName ?? "",
        mobile: order.mobile ?? "",
        branch: order.branch ?? "",
        fulfillment: order.fulfillment ?? "",
        osNo: order.osNo ?? "",
        invoiceNo: order.invoiceNo ?? "",
        finalTotal: order.finalTotal ?? 0,
        paymentMode: order.paymentMode ?? "",
      });
    }
  }, [order, editing]);

  const handleChange = (key: string, value: string | number) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!order) return;
    await updateOrder({ token: token!, trackingId: order.trackingId, ...form });
    setEditing(false);
    alert("Order updated");
  };

  if (!mounted) return <main className="p-8">Loading...</main>;
  if (!token) return <main className="p-8">Loading...</main>;
  if (!order) {
    return (
      <div className="min-h-screen font-body">
        <header className="glass sticky top-0 z-20 border-b">
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 !rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-6">
          <div className="glass-strong rounded-3xl p-6">Order not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base font-semibold">← Back</button>
          <img src="/rf-logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <p className="font-display font-bold text-slate-900">RF FROZEN MEAT</p>
          <div className="ml-auto flex gap-2"><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <h2 className="font-bold text-slate-900 mb-4">Order Details – {order.trackingId}</h2>
        {editing ? (
          <form className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Customer Name</label><input type="text" className="w-full rounded-xl border p-2 text-sm" value={form.customerName} onChange={e => handleChange("customerName", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Contact Name</label><input type="text" className="w-full rounded-xl border p-2 text-sm" value={form.contactName} onChange={e => handleChange("contactName", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Company Name</label><input type="text" className="w-full rounded-xl border p-2 text-sm" value={form.companyName} onChange={e => handleChange("companyName", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" className="w-full rounded-xl border p-2 text-sm" value={form.mobile} onChange={e => handleChange("mobile", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Branch</label><select className="w-full rounded-xl border p-2 text-sm" value={form.branch} onChange={e => handleChange("branch", e.target.value)}>
              <option value="stamesa">Stamesa</option>
              <option value="qc">QC</option>
              <option value="pasig">Pasig</option>
              <option value="blumentritt">Blumentritt</option>
              <option value="novaliches">Novaliches</option>
              <option value="laspinas">Laspinas</option>
            </select></div>
            <div><label className="block text-sm font-medium mb-1">Fulfillment</label><select className="w-full rounded-xl border p-2 text-sm" value={form.fulfillment} onChange={e => handleChange("fulfillment", e.target.value)}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select></div>
            <div><label className="block text-sm font-medium mb-1">OS #</label><input type="text" className="w-full rounded-xl border p-2 text-sm" value={form.osNo} onChange={e => handleChange("osNo", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Invoice #</label><input type="text" className="w-full rounded-xl border p-2 text-sm" value={form.invoiceNo} onChange={e => handleChange("invoiceNo", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">Final Total</label><input type="number" className="w-full rounded-xl border p-2 text-sm" value={form.finalTotal} onChange={e => handleChange("finalTotal", Number(e.target.value))} /></div>
            <div><label className="block text-sm font-medium mb-1">Payment Mode</label><select className="w-full rounded-xl border p-2 text-sm" value={form.paymentMode} onChange={e => handleChange("paymentMode", e.target.value)}>
              <option value="GCASH">GCash</option>
              <option value="MAYA">Maya</option>
              <option value="BDO">BDO</option>
              <option value="GOTYME">GOTYME</option>
              <option value="CASH">Cash</option>
            </select></div>
            <div className="flex gap-2">
              <button type="button" onClick={save} className="flex-1 rounded-xl bg-rose-600 text-white font-bold py-2">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-gray-300 py-2">Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <table className="w-full text-left">
              <tbody>
                <tr><td className="p-2 font-medium">Customer</td><td className="p-2">{order.customerName}</td></tr>
                <tr><td className="p-2 font-medium">Contact</td><td className="p-2">{order.contactName}</td></tr>
                <tr><td className="p-2 font-medium">Company</td><td className="p-2">{order.companyName ?? "-"}</td></tr>
                <tr><td className="p-2 font-medium">Phone</td><td className="p-2">{order.mobile}</td></tr>
                <tr><td className="p-2 font-medium">Branch</td><td className="p-2">{order.branch}</td></tr>
                <tr><td className="p-2 font-medium">Fulfillment</td><td className="p-2">{order.fulfillment}</td></tr>
                <tr><td className="p-2 font-medium">OS #</td><td className="p-2">{order.osNo ?? "-"}</td></tr>
                <tr><td className="p-2 font-medium">Invoice #</td><td className="p-2">{order.invoiceNo ?? "-"}</td></tr>
                <tr><td className="p-2 font-medium">Final Total</td><td className="p-2">₱{order.finalTotal?.toLocaleString() ?? order.estimateTotal?.toLocaleString()}</td></tr>
                <tr><td className="p-2 font-medium">Payment Mode</td><td className="p-2">{order.paymentMode ?? "-"}</td></tr>
                <tr><td className="p-2 font-medium">Status</td><td className="p-2">{order.status}</td></tr>
              </tbody>
            </table>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditing(true)} className="flex-1 rounded-xl bg-blue-600 text-white py-2">Edit</button>
              <a href={`/track/${order.trackingId}`} className="flex-1 rounded-xl border py-2 text-center">Customer receipt</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
