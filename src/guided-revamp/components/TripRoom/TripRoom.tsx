import { useState, useEffect } from 'react';
import { X, MessageCircle, CreditCard, FileText, BarChart3, Users, MoreVertical, Loader } from 'lucide-react';
import { TripRoom as TripRoomType } from '../../services/tripRoomService';
import { getTripRoomByBookingId } from '../../services/tripRoomService';
import { useAuth } from '../../contexts/AuthContext';
import ChatTab from './ChatTab';
import PaymentsTab from './PaymentsTab';
import DocsTab from './DocsTab';
import SummaryTab from './SummaryTab';
import MembersTab from './MembersTab';
import { supabase } from '../../lib/supabase';

interface TripRoomProps {
  bookingId: string;
  bookingReference: string;
  onClose: () => void;
}

type TabType = 'chat' | 'payments' | 'docs' | 'summary' | 'members';

export default function TripRoom({ bookingId, bookingReference, onClose }: TripRoomProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [room, setRoom] = useState<TripRoomType | null>(null);
  const [tripInfo, setTripInfo] = useState<any>(null);
  const [departureInfo, setDepartureInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    loadRoomData();
  }, [bookingId]);

  const loadRoomData = async () => {
    setLoading(true);

    const roomData = await getTripRoomByBookingId(bookingId);

    if (!roomData) {
      alert('Trip room not found. This booking may not be confirmed yet.');
      onClose();
      return;
    }

    setRoom(roomData);

    const [tripData, departureData] = await Promise.all([
      supabase.from('guided_trips').select('*').eq('id', roomData.trip_id).maybeSingle(),
      supabase.from('guided_trip_departure_dates').select('*').eq('id', roomData.departure_id).maybeSingle(),
    ]);

    setTripInfo(tripData.data);
    setDepartureInfo(departureData.data);
    setIsAgent(roomData.agent_id === profile?.id);

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'chat':
        return <MessageCircle className="w-5 h-5" />;
      case 'payments':
        return <CreditCard className="w-5 h-5" />;
      case 'docs':
        return <FileText className="w-5 h-5" />;
      case 'summary':
        return <BarChart3 className="w-5 h-5" />;
      case 'members':
        return <Users className="w-5 h-5" />;
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'chat':
        return 'Chat';
      case 'payments':
        return 'Payments';
      case 'docs':
        return 'Docs';
      case 'summary':
        return 'Summary';
      case 'members':
        return 'Members';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-12">
          <Loader className="w-12 h-12 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-600 mt-4">Loading trip room...</p>
        </div>
      </div>
    );
  }

  if (!room || !tripInfo || !departureInfo) {
    return null;
  }

  const tabs: TabType[] = ['chat', 'payments', 'docs', 'summary', 'members'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl">
                {room.room_name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{room.room_name}</h1>
                <p className="text-gray-300 text-xs sm:text-sm">
                  {departureInfo.booked_pax || 0} Pax • {formatDate(departureInfo.start_date)}-{formatDate(departureInfo.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <MoreVertical className="w-6 h-6" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {getTabIcon(tab)}
                <span>{getTabLabel(tab)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeTab === 'chat' && (
            <ChatTab
              roomId={room.id}
              currentUserName={profile?.full_name || 'User'}
              currentUserType={isAgent ? 'agent' : 'customer'}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsTab
              roomId={room.id}
              bookingId={bookingId}
            />
          )}
          {activeTab === 'docs' && (
            <DocsTab
              roomId={room.id}
              isAgent={isAgent}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryTab
              roomId={room.id}
              tripId={room.trip_id}
              departureId={room.departure_id}
            />
          )}
          {activeTab === 'members' && (
            <MembersTab roomId={room.id} />
          )}
        </div>
      </div>
    </div>
  );
}
