import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useFairShare } from '../hooks/useFairShare';
import { formatMAS } from '../config/contract';
import type { Group } from '../types/contract';
import Logo from '../components/ui/Logo';

interface GroupWithBalance extends Group {
  myBalance: number;
}

export default function Home() {
  const { isConnected, address } = useWallet();
  const { getUserGroups, getGroupInfo, getMemberBalance } = useFairShare();

  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);

  useEffect(() => {
    const loadGroups = async () => {
      if (!isConnected || !address) return;

      setIsLoading(true);
      try {
        const groupIds = await getUserGroups(address);

        const groupsWithBalances: GroupWithBalance[] = [];
        let owedToMe = 0;
        let iOwe = 0;

        for (const groupId of groupIds) {
          const groupInfo = await getGroupInfo(groupId);
          if (groupInfo) {
            const myBalance = await getMemberBalance(groupId, address);
            groupsWithBalances.push({
              ...groupInfo,
              myBalance,
            });

            if (myBalance > 0) {
              owedToMe += myBalance;
            } else if (myBalance < 0) {
              iOwe += Math.abs(myBalance);
            }
          }
        }

        setGroups(groupsWithBalances);
        setTotalOwed(owedToMe);
        setTotalOwe(iOwe);
      } catch (error) {
        console.error('Error loading groups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [isConnected, address, getUserGroups, getGroupInfo, getMemberBalance]);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Logo size="xl" className="text-green-600 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FairShare
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
          Split expenses with friends, powered by Massa blockchain.
          Automatic settlements, transparent history.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-green-800 font-medium">
            Connect your wallet to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
          <p className="text-gray-600 mt-1">Manage your expense sharing groups</p>
        </div>
        <Link
          to="/create"
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
        >
          <span>+</span>
          <span>New Group</span>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Groups</p>
          <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">You're Owed</p>
          <p className="text-2xl font-bold text-green-600">
            +{formatMAS(totalOwed.toString())} MAS
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">You Owe</p>
          <p className="text-2xl font-bold text-red-600">
            -{formatMAS(totalOwe.toString())} MAS
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your groups...</p>
        </div>
      )}

      {/* Groups List */}
      {!isLoading && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <Link
              key={group.groupId}
              to={`/group/${group.groupId}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {group.name}
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {group.members.length} members • {group.expenseCount} expenses
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Your balance</p>
                  <p
                    className={`text-xl font-bold ${
                      group.myBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {group.myBalance >= 0 ? '+' : ''}
                    {formatMAS(Math.abs(group.myBalance).toString())} MAS
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Total: {formatMAS(group.totalExpenses)} MAS
                  </span>
                  <span className="text-green-600 font-medium">
                    View details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && groups.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-600 mb-4">No groups yet</p>
          <Link
            to="/create"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            Create your first group
          </Link>
        </div>
      )}
    </div>
  );
}
