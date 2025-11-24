import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../contexts/WalletContext";
import { useFairShare } from "../hooks/useFairShare";
import { toast } from "sonner";

export default function CreateGroup() {
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const { createGroup } = useFairShare();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    members: [""],
    enableAutoSettlement: false,
    settlementDate: "",
  });

  const addMember = () => {
    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, ""],
    }));
  };

  const removeMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  const updateMember = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.map((m, i) => (i === index ? value : m)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    // Filter out empty members
    const validMembers = formData.members.filter((m) => m.trim());

    // Calculate settlement timestamp if auto-settlement is enabled
    let settlementTimestamp = 0;
    if (formData.enableAutoSettlement && formData.settlementDate) {
      settlementTimestamp = new Date(formData.settlementDate).getTime();
    }

    setIsSubmitting(true);
    try {
      const result = await createGroup({
        name: formData.name,
        members: validMembers,
        settlementDate: settlementTimestamp,
      });

      if (result.success && result.groupId) {
        navigate(`/group/${result.groupId}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mx-auto py-20 max-w-2xl text-center">
        <div className="mb-4 text-4xl">🔒</div>
        <p className="text-gray-600">
          Please connect your wallet to create a group
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 font-bold text-gray-900 text-3xl">
        Create New Group
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Group Name */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <label className="block mb-2 font-medium text-gray-700 text-sm">
            Group Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g., Paris Trip"
            className="px-4 py-3 border border-gray-300 focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 w-full"
            maxLength={50}
          />
        </div>

        {/* Members */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <label className="block mb-4 font-medium text-gray-700 text-sm">
            Members (Massa Addresses)
          </label>

          <div className="space-y-3">
            {/* Current user (auto-added) */}
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={address || ""}
                disabled
                className="flex-1 bg-gray-50 px-4 py-3 border border-gray-200 rounded-lg font-mono text-gray-500 text-sm"
              />
              <span className="font-medium text-green-600 text-sm">You</span>
            </div>

            {/* Other members */}
            {formData.members.map((member, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(index, e.target.value)}
                  placeholder="AU12..."
                  className="flex-1 px-4 py-3 border border-gray-300 focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                {formData.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="hover:bg-red-50 p-2 rounded-lg text-red-500"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMember}
            className="flex items-center space-x-1 mt-4 font-medium text-green-600 hover:text-green-700"
          >
            <span>+</span>
            <span>Add another member</span>
          </button>
        </div>

        {/* Auto-settlement */}
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <label className="block font-medium text-gray-700 text-sm">
                Auto-Settlement
              </label>
              <p className="mt-1 text-gray-500 text-sm">
                Automatically close the group and calculate final balances at a
                specific date
                <br /> (coming soon)
              </p>
            </div>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableAutoSettlement}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    enableAutoSettlement: e.target.checked,
                  }))
                }
                disabled
                className="sr-only peer"
              />
              <div className="peer after:top-[2px] after:left-[2px] after:absolute bg-gray-200 after:bg-white peer-checked:bg-green-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {formData.enableAutoSettlement && (
            <input
              type="datetime-local"
              value={formData.settlementDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  settlementDate: e.target.value,
                }))
              }
              className="px-4 py-3 border border-gray-300 focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 w-full"
            />
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.name.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 py-4 rounded-xl w-full font-medium text-white transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}
