/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import type { CurrencyCode } from './currencyUtils';

function isSchemaDriftError(error: any): boolean {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('relation "trips" does not exist') ||
    message.includes('relation "join_requests" does not exist') ||
    message.includes('could not find the table')
  );
}

export interface TripFilters {
  status?: string[];
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  type?: 'community' | 'guided';
}

export async function fetchTrips(filters?: TripFilters) {
  // Select only essential fields to reduce payload size
  let query = supabase
    .from('trips')
    .select(`
      id,
      title,
      destination,
      cover_image,
      start_date,
      end_date,
      price,
      currency,
      visibility,
      creator_id,
      max_participants,
      current_participants,
      tags,
      requirements,
      type,
      slug,
      created_at,
      creator:profiles!trips_creator_id_fkey(id, username, avatar_url)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50); // Add pagination limit

  if (filters?.destination) {
    query = query.ilike('destination', `%${filters.destination}%`);
  }

  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice);
  }

  // If maxPrice is set, include trips with price <= maxPrice OR price is null
  if (filters?.maxPrice !== undefined) {
    query = query.or(`price.lte.${filters.maxPrice},price.is.null`);
  }

  if (filters?.startDate) {
    query = query.gte('start_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('end_date', filters.endDate);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  // Include private trips only for the owner or trip members; public for everyone else
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (userId) {
      // Get list of trips where user is a member
      const { data: memberTrips } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId)
        .is('left_at', null);
      
      const memberTripIds = memberTrips?.map(m => m.trip_id) || [];
      
      // Show: public trips, trips created by user, or trips where user is a member
      if (memberTripIds.length > 0) {
        query = query.or(`visibility.eq.public,creator_id.eq.${userId},id.in.(${memberTripIds.join(',')})`);
      } else {
        query = query.or(`visibility.eq.public,creator_id.eq.${userId}`);
      }
    } else {
      query = query.eq('visibility', 'public');
    }
  } catch {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function fetchTripDetails(tripIdOrSlug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripIdOrSlug);

  let query = supabase
    .from('trips')
    .select(`
      id,
      title,
      description,
      destination,
      cover_image,
      images,
      start_date,
      end_date,
      price,
      currency,
      visibility,
      max_participants,
      current_participants,
      tags,
      type,
      slug,
      status,
      difficulty_level,
      itinerary,
      itinerary_type,
      stops,
      budget_mode,
      budget_breakdown,
      travel_styles,
      created_at,
      creator_id,
      creator:profiles!trips_creator_id_fkey(id, username, full_name, avatar_url, bio),
      trip_members(
        id,
        role,
        is_admin,
        joined_at,
        left_at,
        user:profiles(id, username, full_name, avatar_url)
      )
    `);

  if (isUuid) {
    query = query.eq('id', tripIdOrSlug);
  } else {
    query = query.eq('slug', tripIdOrSlug);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchJoinRequestStatus(tripId: string, userId: string) {
  const { data, error } = await supabase
    .from('join_requests')
    .select('id, status, created_at')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function fetchUserTrips(userId: string) {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      trip:trips(
        *,
        creator:profiles!trips_creator_id_fkey(id, username, full_name, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .is('left_at', null);

  if (error) throw error;
  return data?.map(item => item.trip) || [];
}

// Lightweight variant for list screens that only need basic trip cards.
export async function fetchUserTripMeta(userId: string) {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      trip:trips(
        id,
        title,
        cover_image
      )
    `)
    .eq('user_id', userId)
    .is('left_at', null);

  if (error) throw error;
  return data?.map((item: any) => item.trip).filter(Boolean) || [];
}

export async function fetchSavedTrips(userId?: string) {
  // Resolve userId if not provided
  let uid = userId;
  if (!uid) {
    const { data: auth } = await supabase.auth.getUser();
    uid = auth?.user?.id;
  }
  if (!uid) return [];

  const { data, error } = await supabase
    .from('saved_trips')
    .select(`
      trip:trips(
        id,
        title,
        destination,
        cover_image,
        start_date,
        end_date,
        price,
        currency,
        visibility,
        creator_id,
        max_participants,
        current_participants,
        tags,
        requirements,
        type,
        slug,
        created_at,
        creator:profiles!trips_creator_id_fkey(id, username, avatar_url)
      )
    `)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  // Map to trip objects
  return (data || []).map((row: any) => row.trip).filter(Boolean);
}

// --- Trip Currency Settings ---
export type TripCurrencySettings = {
  home_currency?: CurrencyCode;
  travel_currencies: CurrencyCode[];
};

export async function getTripCurrencySettings(tripId: string): Promise<TripCurrencySettings> {
  const { data, error } = await supabase
    .from('trips')
    .select('currency_settings')
    .eq('id', tripId)
    .maybeSingle();

  if (error) throw error;
  const settings = (data?.currency_settings as TripCurrencySettings) || { travel_currencies: [] };
  return settings;
}

export async function updateTripCurrencySettings(tripId: string, settings: TripCurrencySettings) {
  const { error } = await supabase
    .from('trips')
    .update({ currency_settings: settings })
    .eq('id', tripId);
  if (error) throw error;
}

export async function createJoinRequest(tripId: string, message?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('join_requests')
    .insert({
      trip_id: tripId,
      user_id: user.id,
      status: 'pending',
      message
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTripInvite(tripId: string, inviteeEmail: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('create-trip-invite', {
    body: { tripId, inviteeEmail },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw error;
  return data;
}

export async function fetchTripInvitesForUser() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trip_invites')
    .select(`
      id,
      status,
      created_at,
      invitee_email,
      inviter_id,
      trip:trips!inner(id, title, cover_image, destination, start_date, end_date, creator_id)
    `)
    .eq('invitee_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const invites = data || [];

  const inviterIds = Array.from(new Set(invites.map((invite: any) => invite.inviter_id).filter(Boolean)));
  let profilesById = new Map<string, any>();
  if (inviterIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .in('id', inviterIds);
    if (profilesError) throw profilesError;
    profilesById = new Map((profiles || []).map((p: any) => [p.id, p]));
  }

  return invites.map((invite: any) => ({
    ...invite,
    inviter: profilesById.get(invite.inviter_id) || null,
  }));
}

export async function acceptTripInvite(inviteId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: invite, error: inviteError } = await supabase
    .from('trip_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('invitee_user_id', userId)
    .select('trip_id, invitee_user_id')
    .single();

  if (inviteError) throw inviteError;

  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: invite.trip_id,
      user_id: invite.invitee_user_id,
      role: 'member',
    });

  if (memberError) throw memberError;

  // Increment current_participants atomically
  const { error: rpcError } = await supabase.rpc('increment', {
    table_name: 'trips',
    row_id: invite.trip_id,
    column_name: 'current_participants',
  });

  // Fallback: if RPC doesn't exist yet, do a manual read+update
  if (rpcError) {
    console.warn('increment RPC failed, using fallback', rpcError.message);
    const { data: tripRow } = await supabase
      .from('trips')
      .select('current_participants')
      .eq('id', invite.trip_id)
      .single();
    await supabase
      .from('trips')
      .update({ current_participants: (tripRow?.current_participants ?? 0) + 1 })
      .eq('id', invite.trip_id);
  }

  try {
    await supabase.functions.invoke('send-trip-invite-accepted', {
      body: { tripId: invite.trip_id, inviteeId: invite.invitee_user_id },
    });
  } catch (e) {
    console.warn('Failed to send invite accepted email', e);
  }

  try {
    await supabase.functions.invoke('send-trip-participant-joined', {
      body: { tripId: invite.trip_id, participantId: invite.invitee_user_id },
    });
  } catch (e) {
    console.warn('Failed to send participant joined email', e);
  }

  return invite;
}

export async function rejectTripInvite(inviteId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trip_invites')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('invitee_user_id', userId)
    .select('trip_id')
    .single();

  if (error) throw error;
  return data;
}

export async function approveJoinRequest(
  requestId: string,
  fallbackContext?: { tripId: string; userId: string }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Prefer server-side RPC path to avoid brittle client-side policy/trigger chains.
  let approvedRequest: { trip_id: string; user_id: string } | null = null;
  let approvalAppliedInDb = false;

  const primaryRpc = await supabase.rpc('approve_join_request', {
    request_id: requestId,
  });

  if (!primaryRpc.error) {
    approvalAppliedInDb = true;
    const rpcRequest = Array.isArray(primaryRpc.data) ? primaryRpc.data[0] : primaryRpc.data;
    const rpcTripId = rpcRequest?.trip_id ?? rpcRequest?.approved_trip_id;
    const rpcUserId = rpcRequest?.user_id ?? rpcRequest?.approved_user_id;
    approvedRequest = {
      trip_id: rpcTripId ?? fallbackContext?.tripId,
      user_id: rpcUserId ?? fallbackContext?.userId,
    };
    // current_participants is handled by the update_trip_participants_count_v2
    // trigger on trip_members (AFTER INSERT +1), no client-side increment needed.
  }

  // Legacy RPC names intentionally skipped to avoid noisy 404s in drifted environments.

  // If RPC paths are unavailable, use UI-provided context as final fallback.
  if (!approvedRequest?.trip_id && fallbackContext?.tripId && fallbackContext?.userId) {
    approvedRequest = { trip_id: fallbackContext.tripId, user_id: fallbackContext.userId };
  }

  if (approvedRequest?.trip_id && approvedRequest?.user_id) {
    if (!approvalAppliedInDb) {
      const { error: directMemberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: approvedRequest.trip_id,
          user_id: approvedRequest.user_id,
          role: 'member'
        });

      if (directMemberError && directMemberError.code !== '23505') {
        throw directMemberError;
      }

      const { error: directCountError } = await supabase.rpc('increment', {
        table_name: 'trips',
        row_id: approvedRequest.trip_id,
        column_name: 'current_participants'
      });

      if (directCountError) {
        console.warn('increment RPC failed in direct fallback path', directCountError.message);
      }
    }

    try {
      await supabase.functions.invoke('send-trip-participant-joined', {
        body: { tripId: approvedRequest.trip_id, participantId: approvedRequest.user_id }
      });
    } catch (e) {
      console.warn('Failed to send participant joined email', e);
    }

    try {
      await supabase.functions.invoke('send-join-status-notification', {
        body: { tripId: approvedRequest.trip_id, userId: approvedRequest.user_id, status: 'approved' }
      });
    } catch (e) {
      console.warn('Failed to send approval email', e);
    }

    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('max_participants, current_participants')
        .eq('id', approvedRequest.trip_id)
        .maybeSingle();

      if (!tripError && tripData && tripData.max_participants && tripData.current_participants >= tripData.max_participants) {
        await supabase.functions.invoke('send-trip-full', {
          body: { tripId: approvedRequest.trip_id }
        });
      }
    } catch (e) {
      console.warn('Failed to send trip full notification', e);
    }

    return approvedRequest;
  }

  // If RPC paths failed and UI already provided trip/user context,
  // bypass join_requests updates (which may be blocked by RLS) and add member directly.
  if (fallbackContext?.tripId && fallbackContext?.userId) {
    const directRequest = {
      trip_id: fallbackContext.tripId,
      user_id: fallbackContext.userId,
    };

    const { error: directMemberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: directRequest.trip_id,
        user_id: directRequest.user_id,
        role: 'member'
      });

    if (directMemberError && directMemberError.code !== '23505') {
      throw directMemberError;
    }

    const { error: directCountError } = await supabase.rpc('increment', {
      table_name: 'trips',
      row_id: directRequest.trip_id,
      column_name: 'current_participants'
    });

    if (directCountError) {
      console.warn('increment RPC failed in UI-context fallback path', directCountError.message);
    }

    try {
      await supabase.functions.invoke('send-trip-participant-joined', {
        body: { tripId: directRequest.trip_id, participantId: directRequest.user_id }
      });
    } catch (e) {
      console.warn('Failed to send participant joined email', e);
    }

    try {
      await supabase.functions.invoke('send-join-status-notification', {
        body: { tripId: directRequest.trip_id, userId: directRequest.user_id, status: 'approved' }
      });
    } catch (e) {
      console.warn('Failed to send approval email', e);
    }

    return directRequest;
  }

  const rpcError = primaryRpc.error;
  if (!rpcError) {
    throw new Error('Unable to approve request: no RPC result and no explicit error');
  }

  const rpcErrorMessage = `${rpcError.message ?? ''} ${rpcError.details ?? ''} ${rpcError.hint ?? ''}`.toLowerCase();
  const isMissingRpcFunction =
    rpcError.code === '42883' ||
    rpcError.code === 'PGRST202' ||
    rpcError.code === 'PGRST301' ||
    rpcErrorMessage.includes('could not find the function') ||
    rpcErrorMessage.includes('no function matches') ||
    rpcErrorMessage.includes('404');

  if (!isMissingRpcFunction) {
    if (isSchemaDriftError(rpcError)) {
      throw new Error('Approvals backend is not fully migrated yet. Run latest Supabase migrations, then retry.');
    }
    throw rpcError;
  }

  const { data: request, error: requestError } = await supabase
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select('trip_id, user_id')
    .maybeSingle();

  if (requestError) {
    const isAmbiguousColumnError = requestError.code === '42702';
    if (isSchemaDriftError(requestError) || isAmbiguousColumnError) {
      // Last-resort fallback for partially migrated environments:
      // fetch request row and add member directly even if status update path is broken.
      const { data: fallbackRequest, error: fallbackRequestError } = await supabase
        .from('join_requests')
        .select('trip_id, user_id')
        .eq('id', requestId)
        .maybeSingle();

      if (fallbackRequestError || !fallbackRequest) {
        if (isAmbiguousColumnError) {
          throw new Error('Approval failed due to a database function conflict (42702). Please apply the latest hotfix SQL and retry.');
        }
        throw new Error('Approvals backend is not fully migrated yet. Run latest Supabase migrations, then retry.');
      }

      const { error: fallbackMemberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: fallbackRequest.trip_id,
          user_id: fallbackRequest.user_id,
          role: 'member'
        });

      if (fallbackMemberError && fallbackMemberError.code !== '23505') {
        throw fallbackMemberError;
      }

      const { error: fallbackCountError } = await supabase.rpc('increment', {
        table_name: 'trips',
        row_id: fallbackRequest.trip_id,
        column_name: 'current_participants'
      });

      if (fallbackCountError) {
        console.warn('increment RPC failed in fallback path', fallbackCountError.message);
      }

      return fallbackRequest;
    }
    throw requestError;
  }
  if (!request) throw new Error('Join request not found or already processed');

  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: request.trip_id,
      user_id: request.user_id,
      role: 'member'
    });

  if (memberError) {
    // Keep fallback behavior aligned with RPC semantics: duplicate member is acceptable.
    if (memberError.code !== '23505') {
      // Best-effort rollback so fallback path does not leave request as approved without membership.
      await supabase
        .from('join_requests')
        .update({
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'approved');

      throw memberError;
    }
  }

  const { error: countError } = await supabase.rpc('increment', {
    table_name: 'trips',
    row_id: request.trip_id,
    column_name: 'current_participants'
  });

  // Fallback: if RPC doesn't exist yet, do a manual read+update
  if (countError) {
    console.warn('increment RPC failed, using fallback', countError.message);
    const { data: tripRow } = await supabase
      .from('trips')
      .select('current_participants')
      .eq('id', request.trip_id)
      .single();
    await supabase
      .from('trips')
      .update({ current_participants: (tripRow?.current_participants ?? 0) + 1 })
      .eq('id', request.trip_id);
  }

  try {
    await supabase.functions.invoke('send-trip-participant-joined', {
      body: { tripId: request.trip_id, participantId: request.user_id }
    });
  } catch (e) {
    console.warn('Failed to send participant joined email', e);
  }

  // Fire email to requester: approved
  try {
    await supabase.functions.invoke('send-join-status-notification', {
      body: { tripId: request.trip_id, userId: request.user_id, status: 'approved' }
    });
  } catch (e) {
    console.warn('Failed to send approval email', e);
  }

  // Check if trip is now full and send trip-full notification
  try {
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('max_participants, current_participants')
      .eq('id', request.trip_id)
      .maybeSingle();
    
    if (!tripError && tripData && tripData.max_participants && tripData.current_participants >= tripData.max_participants) {
      await supabase.functions.invoke('send-trip-full', {
        body: { tripId: request.trip_id }
      });
    }
  } catch (e) {
    console.warn('Failed to send trip full notification', e);
  }

  return request;
}

export async function cancelTrip(tripId: string, reason?: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('id', tripId)
    .eq('creator_id', userId)
    .select('id')
    .single();

  if (error) throw error;

  try {
    await supabase.functions.invoke('send-trip-cancelled', {
      body: { tripId, cancelledById: userId, reason },
    });
  } catch (e) {
    console.warn('Failed to send trip cancelled email', e);
  }

  return data;
}

export async function rejectJoinRequest(requestId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('join_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  // Fire email to requester: rejected
  try {
    await supabase.functions.invoke('send-join-status-notification', {
      body: { tripId: data.trip_id, userId: data.user_id, status: 'rejected' }
    });
  } catch (e) {
    console.warn('Failed to send rejection email', e);
  }
  return data;
}

export async function fetchJoinRequests(tripId: string) {
  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      *,
      user:profiles!join_requests_user_id_fkey(id, username, full_name, avatar_url, bio)
    `)
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    if (isSchemaDriftError(error)) return [];
    throw error;
  }
  return data;
}

export async function fetchAllJoinRequestsForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      *,
      user:profiles!join_requests_user_id_fkey(id, username, full_name, avatar_url, bio),
      trip:trips!inner(id, title, cover_image, destination, start_date, end_date, creator_id)
    `)
    .eq('trip.creator_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (isSchemaDriftError(error)) return [];
    throw error;
  }

  // Fetch trip counts for each unique user
  if (data && data.length > 0) {
    const userIds = [...new Set(data.map((req: any) => req.user_id))];
    
    const tripCounts = await Promise.all(
      userIds.map(async (userId) => {
        // Count trips where user is creator
        const { count: createdCount, error: createdCountError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId)
          .eq('status', 'published');

        if (createdCountError && !isSchemaDriftError(createdCountError)) {
          throw createdCountError;
        }

        // Count trips where user is a member
        const { count: memberCount, error: memberCountError } = await supabase
          .from('trip_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('left_at', null);

        if (memberCountError && !isSchemaDriftError(memberCountError)) {
          throw memberCountError;
        }

        return {
          userId,
          count: (createdCount || 0) + (memberCount || 0)
        };
      })
    );

    // Add trip counts to the data
    const enrichedData = data.map((req: any) => ({
      ...req,
      user: {
        ...req.user,
        tripsCount: tripCounts.find(tc => tc.userId === req.user_id)?.count || 0
      }
    }));

    return enrichedData;
  }

  return data;
}

export async function leaveTripMember(tripId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('trip_members')
    .update({ left_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export interface CreateTripData {
  title: string;
  description?: string;
  destination: string;
  cover_image?: string;
  images?: string[];
  start_date?: string;
  end_date?: string;
  max_participants?: number;
  visibility: string;
  tags?: string[];
  travel_styles?: string[];
  stops?: string;
  budget_mode?: string;
  budget_breakdown?: Record<string, any>;
  itinerary_type?: string;
  itinerary?: any[];
  status?: 'draft' | 'published';
  type: 'community' | 'guided';
  currency?: string;
  price?: number;
}

export async function createTrip(data: CreateTripData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const tripData = {
    creator_id: user.id,
    type: data.type,
    status: data.status || 'draft',
    title: data.title,
    description: data.description || null,
    destination: data.destination,
    cover_image: data.cover_image || null,
    images: data.images || [],
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    max_participants: data.max_participants || null,
    visibility: data.visibility,
    tags: data.tags || [],
    travel_styles: data.travel_styles || [],
    stops: data.stops || null,
    budget_mode: data.budget_mode || null,
    budget_breakdown: data.budget_breakdown || null,
    itinerary_type: data.itinerary_type || null,
    itinerary: data.itinerary || [],
    currency: data.currency || 'MYR',
    price: data.price || null,
  };

  const { data: trip, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single();

  if (error) throw error;
  return trip;
}

export async function updateTrip(tripId: string, data: Partial<CreateTripData>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch current trip to detect changed fields
  const { data: currentTrip, error: fetchErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('creator_id', user.id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!currentTrip) throw new Error('Trip not found or not authorized');

  const updateData: Record<string, any> = {};
  const changedFields: string[] = [];
  
  // Debug logging
  console.log('updateTrip called with data:', data);
  console.log('Current trip data:', currentTrip);

  if (data.title !== undefined && data.title !== currentTrip.title) {
    updateData.title = data.title;
    changedFields.push('title');
  }
  if (data.description !== undefined && data.description !== currentTrip.description) {
    updateData.description = data.description;
    changedFields.push('description');
  }
  if (data.destination !== undefined && data.destination !== currentTrip.destination) {
    updateData.destination = data.destination;
    changedFields.push('destination');
  }
  if (data.cover_image !== undefined && data.cover_image !== currentTrip.cover_image) {
    updateData.cover_image = data.cover_image;
    changedFields.push('cover_image');
  }
  if (data.images !== undefined && JSON.stringify(data.images) !== JSON.stringify(currentTrip.images)) {
    updateData.images = data.images;
    changedFields.push('images');
  }
  if (data.start_date !== undefined && data.start_date !== currentTrip.start_date) {
    updateData.start_date = data.start_date;
    changedFields.push('start_date');
  }
  if (data.end_date !== undefined && data.end_date !== currentTrip.end_date) {
    updateData.end_date = data.end_date;
    changedFields.push('end_date');
  }
  if (data.max_participants !== undefined && data.max_participants !== currentTrip.max_participants) {
    updateData.max_participants = data.max_participants;
    changedFields.push('max_participants');
  }
  if (data.visibility !== undefined && data.visibility !== currentTrip.visibility) {
    updateData.visibility = data.visibility;
    changedFields.push('visibility');
  }
  if (data.tags !== undefined && JSON.stringify(data.tags) !== JSON.stringify(currentTrip.tags)) {
    updateData.tags = data.tags;
    changedFields.push('tags');
  }
  if (data.travel_styles !== undefined && JSON.stringify(data.travel_styles) !== JSON.stringify(currentTrip.travel_styles)) {
    updateData.travel_styles = data.travel_styles;
    changedFields.push('travel_styles');
  }
  if (data.stops !== undefined && data.stops !== currentTrip.stops) {
    updateData.stops = data.stops;
    changedFields.push('stops');
  }
  if (data.budget_mode !== undefined && data.budget_mode !== currentTrip.budget_mode) {
    updateData.budget_mode = data.budget_mode;
    changedFields.push('budget_mode');
  }
  if (data.budget_breakdown !== undefined && JSON.stringify(data.budget_breakdown) !== JSON.stringify(currentTrip.budget_breakdown)) {
    updateData.budget_breakdown = data.budget_breakdown;
    changedFields.push('budget_breakdown');
  }
  if (data.itinerary_type !== undefined && data.itinerary_type !== currentTrip.itinerary_type) {
    updateData.itinerary_type = data.itinerary_type;
    changedFields.push('itinerary_type');
  }
  if (data.itinerary !== undefined && JSON.stringify(data.itinerary) !== JSON.stringify(currentTrip.itinerary)) {
    updateData.itinerary = data.itinerary;
    changedFields.push('itinerary');
  }
  if (data.status !== undefined && data.status !== currentTrip.status) {
    updateData.status = data.status;
    changedFields.push('status');
  }
  if (data.currency !== undefined && data.currency !== currentTrip.currency) {
    updateData.currency = data.currency;
    changedFields.push('currency');
  }
  if (data.price !== undefined && data.price !== currentTrip.price) {
    updateData.price = data.price;
    changedFields.push('price');
  }

  // No-op updates should not fail callers (e.g., manual "Save as Draft" with unchanged data).
  if (Object.keys(updateData).length === 0) {
    return currentTrip;
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .update(updateData)
    .eq('id', tripId)
    .eq('creator_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Trip update error:', error);
    console.error('updateData was:', updateData);
    console.error('changedFields were:', changedFields);
    throw error;
  }

  // If trip dates changed, recalculate reminders
  if ((changedFields.includes('start_date') || changedFields.includes('end_date')) && trip.status === 'published') {
    try {
      await recalculateTripReminders(tripId, trip.start_date, trip.end_date);
    } catch (err) {
      console.warn('Failed to recalculate trip reminders:', err);
      // Don't throw - reminder failure shouldn't block trip update
    }
  }

  // Send push notification to trip members if trip is published and fields changed
  if (trip.status === 'published' && changedFields.length > 0) {
    try {
      await supabase.functions.invoke('send-trip-updated', {
        body: {
          tripId: trip.id,
          updatedFields: changedFields,
        },
      });
    } catch (err) {
      console.warn('Failed to send trip update notification:', err);
      // Don't throw - notification failure shouldn't block trip update
    }
  }

  return trip;
}

async function recalculateTripReminders(tripId: string, startDate: string, endDate: string) {
  // Delete old reminders (if any exist)
  await supabase
    .from('trip_reminders_scheduled')
    .delete()
    .eq('trip_id', tripId);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDateObj = new Date(startDate);

  // Calculate new reminder dates: 7 days, 3 days, and 1 day before
  const remindersToCreate = [
    { type: '7_days', daysBeforeStart: 7 },
    { type: '3_days', daysBeforeStart: 3 },
    { type: '1_day', daysBeforeStart: 1 },
  ].map(({ type, daysBeforeStart }) => {
    const reminderDate = new Date(startDateObj);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeStart);

    return {
      trip_id: tripId,
      reminder_type: type,
      scheduled_date: formatDate(reminderDate),
      sent: false,
    };
  });

  // Add trip end reminder if end_date exists
  if (endDate) {
    const endDateObj = new Date(endDate);
    remindersToCreate.push({
      trip_id: tripId,
      reminder_type: 'trip_end',
      scheduled_date: formatDate(endDateObj),
      sent: false,
    });
  }

  // Insert new reminders
  const { error } = await supabase
    .from('trip_reminders_scheduled')
    .insert(remindersToCreate);

  if (error) {
    console.error('Error creating trip reminders:', error);
    throw error;
  }

  console.log(`Recalculated ${remindersToCreate.length} trip reminders for trip ${tripId}`);
}

export async function fetchUserDraftTrips(userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      creator:profiles!trips_creator_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('creator_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteDraftTrip(tripId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('creator_id', user.id)
    .eq('status', 'draft');

  if (error) throw error;
}
