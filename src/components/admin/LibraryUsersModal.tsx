// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LibraryUser {
  user_id: string;
  display_name: string;
  email: string;
  added_at: string;
  subscription_status: string;
  is_trialing: boolean;
  plan_name: string | null;
}

interface LibraryUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

export const LibraryUsersModal = ({ isOpen, onClose, creatorId, creatorName }: LibraryUsersModalProps) => {
  const [users, setUsers] = useState<LibraryUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && creatorId) {
      fetchLibraryUsers();
    }
  }, [isOpen, creatorId]);

  const fetchLibraryUsers = async () => {
    setLoading(true);
    try {
      
      
      // Get songs by this creator first
      const { data: creatorSongs, error: songsError } = await supabase
        .from('songs')
        .select('id, title, artist')
        .eq('user_id', creatorId)
        .eq('is_production', true);

      

      if (songsError) {
        console.error('Error fetching creator songs:', songsError);
        setUsers([]);
        return;
      }

      if (!creatorSongs || creatorSongs.length === 0) {
        
        setUsers([]);
        return;
      }

      const songIds = creatorSongs.map(song => song.id);
      

      // Get all library actions for these songs
      const { data: libraryActions, error: actionsError } = await supabase
        .from('user_library_actions')
        .select('user_id, song_id, created_at, action_type')
        .in('song_id', songIds)
        .eq('action_type', 'add_to_library')
        .eq('is_production', true);

      

      if (actionsError) {
        console.error('Error fetching library actions:', actionsError);
        setUsers([]);
        return;
      }

      if (!libraryActions || libraryActions.length === 0) {
        
        setUsers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(libraryActions.map(action => action.user_id))];
      
      
      const usersWithSubscriptions = await Promise.all(
        userIds.map(async (userId) => {
          try {
            // Get user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', userId)
              .eq('is_production', true)
              .maybeSingle();

            if (profileError) {
              console.error('Error fetching profile for user:', userId, profileError);
            }

            // Get subscription status
            const { data: subscription, error: subError } = await supabase
              .from('subscriptions')
              .select(`
                status,
                is_trial,
                subscription_plans(name)
              `)
              .eq('user_id', userId)
              .eq('is_production', true)
              .order('created_at', { ascending: false })
              .maybeSingle();

            if (subError) {
              console.error('Error fetching subscription for user:', userId, subError);
            }

            // Get the earliest library action for this user
            const userActions = libraryActions.filter(action => action.user_id === userId);
            const earliestAction = userActions.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0];
            
            console.log('Processing user:', {
              userId,
              profile: profile?.display_name,
              subscription: subscription?.status,
              actionsCount: userActions.length,
              earliestAction: earliestAction?.created_at
            });

            return {
              user_id: userId,
              display_name: profile?.display_name || 'Unknown User',
              email: 'Email not available',
              added_at: earliestAction?.created_at || '',
              subscription_status: subscription?.status || 'none',
              is_trialing: subscription?.is_trial || false,
              plan_name: subscription?.subscription_plans?.name || null
            };
          } catch (error) {
            console.error('Error processing user:', userId, error);
            return {
              user_id: userId,
              display_name: 'Unknown User',
              email: 'Email not available',
              added_at: '',
              subscription_status: 'none',
              is_trialing: false,
              plan_name: null
            };
          }
        })
      );

      
      setUsers(usersWithSubscriptions);
    } catch (error) {
      console.error('Error fetching library users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (user: LibraryUser) => {
    if (user.subscription_status === 'active') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    }
    if (user.subscription_status === 'trialing') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial</Badge>;
    }
    if (user.subscription_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    if (user.subscription_status === 'cancelled') {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
    }
    return <Badge variant="destructive">No Subscription</Badge>;
  };

  const eligibleUsers = users.filter(user => 
    user.subscription_status === 'active' || user.subscription_status === 'trialing'
  );

  const ineligibleUsers = users.filter(user => 
    user.subscription_status !== 'active' && user.subscription_status !== 'trialing'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Library Users - {creatorName}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{eligibleUsers.length}</div>
                <div className="text-sm text-green-600">Eligible Users</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-800">{ineligibleUsers.length}</div>
                <div className="text-sm text-red-600">Ineligible Users</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{users.length}</div>
                <div className="text-sm text-blue-600">Total Users</div>
              </div>
            </div>

            {/* Users Table */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Subscription Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Added Date</TableHead>
                    <TableHead>Eligibility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.display_name}</TableCell>
                      <TableCell>{getSubscriptionBadge(user)}</TableCell>
                      <TableCell>{user.plan_name || 'N/A'}</TableCell>
                      <TableCell>{new Date(user.added_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {eligibleUsers.includes(user) ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">✓ Eligible</Badge>
                        ) : (
                          <Badge variant="destructive">✗ Not Eligible</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users have added this creator's songs to their library.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};