import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useWallet } from "../contexts/WalletContext";
import { useFairShare } from "../hooks/useFairShare";
import toast from "react-hot-toast";
import { ExpenseCategory, categoryLabels } from "../types/contract";

export default function AddExpense() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const { addExpense } = useFairShare();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: ExpenseCategory.Other,
    splitEqually: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error("Wallet connection required");
      return;
    }

    if (!groupId) {
      toast.error("No group ID provided");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a valid number");
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        groupId: parseInt(groupId, 10),
        description: formData.description,
        amount: amount,
        category: formData.category,
        // Empty array = split between all members
        splitBetween: formData.splitEqually ? [] : [],
      });

      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error("Failed to add expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mx-auto py-20 max-w-2xl text-center">
        <div className="mb-4 text-4xl">🔒</div>
        <p className="text-gray-600">
          Please connect your wallet to add an expense
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/group/${groupId}`}
        className="inline-block mb-4 text-green-600 hover:text-green-700 text-sm"
      >
        ← Back to group
      </Link>
      <h1 className="mb-8 font-bold text-gray-900 text-3xl">Add Expense</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <label className="block mb-2 font-medium text-gray-700 text-sm">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="e.g., Restaurant dinner"
            className="px-4 py-3 border border-gray-300 focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 w-full"
            maxLength={200}
          />
        </div>

        {/* Amount */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <label className="block mb-2 font-medium text-gray-700 text-sm">
            Amount (MAS)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              className="px-4 py-3 pr-16 border border-gray-300 focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 w-full"
            />
            <span className="top-1/2 right-4 absolute font-medium text-gray-500 -translate-y-1/2">
              MAS
            </span>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <label className="block mb-3 font-medium text-gray-700 text-sm">
            Category
          </label>
          <div className="gap-3 grid grid-cols-2 md:grid-cols-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    category: parseInt(key) as ExpenseCategory,
                  }))
                }
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.category === parseInt(key)
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Split */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <label className="block font-medium text-gray-700 text-sm">
                Split Equally
              </label>
              <p className="mt-1 text-gray-500 text-sm">
                Split this expense equally between all group members <br />{" "}
                (split not equally coming soon)
              </p>
            </div>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.splitEqually}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    splitEqually: e.target.checked,
                  }))
                }
                disabled
                className="sr-only peer"
              />
              <div className="peer after:top-[2px] after:left-[2px] after:absolute bg-gray-200 after:bg-white peer-checked:bg-green-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            isSubmitting || !formData.description.trim() || !formData.amount
          }
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 py-4 rounded-xl w-full font-medium text-white transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Adding..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
