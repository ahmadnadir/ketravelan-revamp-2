import { useState, useEffect } from 'react';
import { Users, Loader, UserCircle } from 'lucide-react';
import { TripRoomMember } from '../../services/tripRoomService';
import { getRoomMembers } from '../../services/tripRoomService';

interface MembersTabProps {
  roomId: string;
}

export default function MembersTab({ roomId }: MembersTabProps) {
  const [members, setMembers] = useState<TripRoomMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [roomId]);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getRoomMembers(roomId);
    setMembers(data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (memberType: string, paymentStatus: string) => {
    if (memberType === 'agent') {
      return 'Active Now';
    }
    return paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
  };

  const getMemberTypeLabel = (memberType: string) => {
    return memberType === 'agent' ? 'Guide' : 'Participant';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const agents = members.filter(m => m.member_type === 'agent');
  const customers = members.filter(m => m.member_type === 'customer');

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Trip Members</h2>
          <p className="text-sm text-gray-600">Guide and participants for this trip</p>
        </div>

        <div className="space-y-4">
          {agents.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {member.member_name.substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg">{member.member_name}</h3>
                <p className="text-sm text-gray-600">{getMemberTypeLabel(member.member_type)}</p>
              </div>

              <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-lg">
                Active Now
              </span>
            </div>
          ))}

          {customers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-10 h-10 text-gray-500" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg">{member.member_name}</h3>
                <p className="text-sm text-gray-600">{getMemberTypeLabel(member.member_type)}</p>
              </div>

              <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusBadge(member.payment_status)}`}>
                {getStatusLabel(member.member_type, member.payment_status)}
              </span>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No members found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
