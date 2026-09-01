import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { getVisibleNewsletterBoards } from '../features/newsletters/newslettersApi';
import { getTeamMembers } from '../features/team/teamApi';
import { teamQueryKeys } from '../features/team/queryKeys';
import { buildNativeMenuForSession } from './nativeMenuPolicy';

const newsletterBoardsQueryKey = ['newsletters', 'visible-boards'] as const;

export function useNativeMenu() {
  const { token, user } = useAuth();
  const isUser = user?.role === 'USER';
  const team = useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => getTeamMembers(token),
    enabled: Boolean(token && isUser && user?.teamId),
    staleTime: 60_000,
  });
  const boards = useQuery({
    queryKey: newsletterBoardsQueryKey,
    queryFn: () => getVisibleNewsletterBoards(token),
    enabled: Boolean(token && isUser),
    staleTime: 60_000,
  });

  return useMemo(
    () => buildNativeMenuForSession(user, {
      isTeamOwner: Boolean(user && team.data?.ownerId === user.id),
      dynamicNewsletterBoards: boards.data,
    }),
    [boards.data, team.data?.ownerId, user],
  );
}
