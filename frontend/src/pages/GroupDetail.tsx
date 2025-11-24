import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useFairShare } from '../hooks/useFairShare';
import { formatMAS } from '../config/contract';
import { categoryLabels, GroupStatus, statusLabels } from '../types/contract';
import { formatAddress } from '../config/wallets';
import { format } from 'date-fns';
import type { Group, Expense, Balance, Settlement, ActivityItem } from '../types/contract';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { isConnected, address } = useWallet();
  const { getGroupInfo, getGroupExpenses, calculateBalances, settleDebt, getSettlements } = useFairShare();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettling, setIsSettling] = useState(false);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;

    setIsLoading(true);
    try {
      const groupIdNum = parseInt(groupId, 10);
      const [groupInfo, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
        getGroupInfo(groupIdNum),
        getGroupExpenses(groupIdNum),
        calculateBalances(groupIdNum),
        getSettlements(groupIdNum),
      ]);

      setGroup(groupInfo);
      setExpenses(groupExpenses);
      setBalances(groupBalances);
      setSettlements(groupSettlements);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, getGroupInfo, getGroupExpenses, calculateBalances, getSettlements]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const handleSettleDebt = async (toAddress: string, amount: string) => {
    if (!groupId) return;

    setIsSettling(true);
    try {
      const amountInMAS = Number(amount) / 1_000_000_000;
      await settleDebt(parseInt(groupId, 10), toAddress, amountInMAS);
      // Reload data after settlement
      await loadGroupData();
    } catch (error) {
      console.error('Error settling debt:', error);
    } finally {
      setIsSettling(false);
    }
  };

  // Find my debts (where I owe someone)
  const myDebts = balances.filter((b) => b.from === address);

  // Create unified activity list sorted by date (most recent first)
  const activities = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [
      ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: e.createdAt })),
      ...settlements.map((s) => ({ type: 'settlement' as const, data: s, date: s.settledAt })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [expenses, settlements]);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Please connect your wallet to view this group</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Group not found</p>
        <Link to="/" className="text-green-600 hover:text-green-700 mt-4 inline-block">
          ← Back to groups
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/" className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block">
            ← Back to groups
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-gray-600 mt-1">
            {group.members.length} members • {group.expenseCount} expenses
            {group.status !== GroupStatus.Active && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                group.status === GroupStatus.Settled
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {statusLabels[group.status]}
              </span>
            )}
          </p>
        </div>
        {group.status === GroupStatus.Active && (
          <Link
            to={`/group/${groupId}/add-expense`}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
          >
            <span>+</span>
            <span>Add Expense</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity List (Expenses + Settlements) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
            </div>
            {activities.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No activity yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activities.map((item) =>
                  item.type === 'expense' ? (
                    <div key={`exp-${item.data.expenseId}`} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.data.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Paid by {formatAddress(item.data.paidBy)} •{' '}
                            {categoryLabels[item.data.category]} •{' '}
                            {format(item.data.createdAt, 'MMM d, HH:mm')}
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatMAS(item.data.amount)} MAS
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={`set-${item.data.settlementId}`} className="px-6 py-4 bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-600 text-xl">✓</span>
                          <div>
                            <p className="font-medium text-green-800">Debt settled</p>
                            <p className="text-sm text-green-600">
                              {formatAddress(item.data.from)} paid {formatAddress(item.data.to)} •{' '}
                              {format(item.data.settledAt, 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold text-green-600">
                          {formatMAS(item.data.amount)} MAS
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-medium">{formatMAS(group.totalExpenses)} MAS</span>
              </div>
              {group.members.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Per Person</span>
                  <span className="font-medium">
                    {formatMAS((BigInt(group.totalExpenses) / BigInt(group.members.length)).toString())} MAS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Balances */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Who owes who</h3>
            {balances.length === 0 ? (
              <p className="text-gray-500 text-sm">All settled!</p>
            ) : (
              <div className="space-y-3">
                {balances.map((balance, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-red-600 font-medium">{formatAddress(balance.from)}</span>
                        <span className="text-gray-500"> owes </span>
                        <span className="text-green-600 font-medium">{formatAddress(balance.to)}</span>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {formatMAS(balance.amount)} MAS
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Settle my debts */}
            {myDebts.length > 0 && group.status === GroupStatus.Active && (
              <div className="mt-4 space-y-2">
                {myDebts.map((debt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSettleDebt(debt.to, debt.amount)}
                    disabled={isSettling}
                    className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl hover:bg-green-50 transition-colors font-medium disabled:opacity-50"
                  >
                    {isSettling ? 'Settling...' : `Pay ${formatMAS(debt.amount)} MAS to ${formatAddress(debt.to)}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
            <div className="space-y-2">
              {group.members.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-gray-700">
                    {formatAddress(member)}
                    {member === address && (
                      <span className="ml-2 text-green-600 text-xs">(You)</span>
                    )}
                    {member === group.creator && (
                      <span className="ml-2 text-blue-600 text-xs">(Creator)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
