import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../../src/auth/AuthProvider';
import { LoadingState } from '../../../../src/components/LoadingState';
import { TeamMembersScreen } from '../../../../src/features/team/TeamMembersScreen';
import { getTeamMembers } from '../../../../src/features/team/teamApi';
import { teamQueryKeys } from '../../../../src/features/team/queryKeys';

/** Web `/team/manage` → members redirect. Owner-only entry (menu injection + route guard). */
export default function Screen() {
  const { token, user } = useAuth();
  const team = useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => getTeamMembers(token),
    enabled: Boolean(token),
  });

  if (team.isLoading) {
    return <LoadingState message="팀 권한을 확인하는 중…" />;
  }

  const isOwner = Boolean(user && team.data?.ownerId === user.id);
  if (!isOwner) {
    return <Redirect href="/team/members" />;
  }

  return <TeamMembersScreen />;
}
