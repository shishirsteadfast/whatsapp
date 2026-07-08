import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sessionApi,
  webhookApi,
  auditApi,
  contactApi,
  groupApi,
  messageApi,
  locationApi,
  authApi,
  systemSettingsApi,
  systemCheckApi,
  messageHealthApi,
  campaignApi,
  apiKeysApi,
  userApi,
  roleApi,
  permissionApi,
  type Webhook,
  type ContactPayload,
  type ContactGroupPayload,
  type FilterParams,
  type CampaignPayload,
  type CampaignUpdatePayload,
  type CreateApiKeyPayload,
  type AuditLogFilters,
  type CreateUserPayload,
  type UpdateUserPayload,
  type CreateRolePayload,
  type UpdateRolePayload,
} from '../services/api';

// ── Query Keys ────────────────────────────────────────────────────────

export const queryKeys = {
  sessions: ['sessions'] as const,
  sessionStats: ['sessions', 'stats'] as const,
  sessionGroups: (sessionId: string) => ['sessions', sessionId, 'groups'] as const,
  webhooks: ['webhooks'] as const,
  logs: (params: { severity?: string; page: number; limit: number }) =>
    ['logs', params] as const,
  activityLog: (filters: AuditLogFilters, page: number, limit: number) =>
    ['activity-log', filters, page, limit] as const,
  contacts: ['contacts'] as const,
  contactGroups: ['groups'] as const,
  contactGroup: (id: string) => ['groups', id] as const,
  countries: ['locations', 'countries'] as const,
  states: (countryId: number) => ['locations', 'states', countryId] as const,
  cities: (stateId: number) => ['locations', 'cities', stateId] as const,
};

// ── Session Queries ───────────────────────────────────────────────────

export function useSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: sessionApi.list,
    staleTime: 30_000,
  });
}

export function useSessionStatsQuery() {
  return useQuery({
    queryKey: queryKeys.sessionStats,
    queryFn: sessionApi.getStats,
    staleTime: 30_000,
  });
}

export function useSessionGroupsQuery(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.sessionGroups(sessionId),
    queryFn: () => sessionApi.getGroups(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 60_000,
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => sessionApi.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
}

export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
}

export function useStartSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.start(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useStopSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.stop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

// ── Webhook Queries ───────────────────────────────────────────────────

export function useWebhooksQuery() {
  return useQuery({
    queryKey: queryKeys.webhooks,
    queryFn: webhookApi.listAll,
    staleTime: 30_000,
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; url: string; events: string[] }) =>
      webhookApi.create(params.sessionId, { url: params.url, events: params.events }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; id: string; data: Partial<Webhook> }) =>
      webhookApi.update(params.sessionId, params.id, params.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; id: string }) =>
      webhookApi.delete(params.sessionId, params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

// ── Logs Queries ──────────────────────────────────────────────────────

export function useLogsQuery(params: { severity?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.logs(params),
    queryFn: () =>
      auditApi.list({
        severity: params.severity,
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      }),
    staleTime: 15_000,
  });
}

// ── Activity Log Queries ─────────────────────────────────────────────

export function useActivityLogQuery(filters: AuditLogFilters, page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.activityLog(filters, page, limit),
    queryFn: () =>
      auditApi.list({
        ...filters,
        limit,
        offset: (page - 1) * limit,
      }),
    staleTime: 15_000,
  });
}

// ── Contact Queries ───────────────────────────────────────────────────

export function useContactsQuery() {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: contactApi.list,
    staleTime: 30_000,
  });
}

export function useCreateContactMutation() {
  return useMutation({
    mutationFn: (data: ContactPayload) => contactApi.create(data),
  });
}

export function useUpdateContactMutation() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactPayload> }) =>
      contactApi.update(id, data),
  });
}

export function useDeleteContactMutation() {
  return useMutation({
    mutationFn: (id: string) => contactApi.delete(id),
  });
}

export function useBulkDeleteContactsMutation() {
  return useMutation({
    mutationFn: (ids: string[]) => contactApi.bulkDelete(ids),
  });
}

// ── Location Queries ───────────────────────────────────────────────

export function useCountriesQuery() {
  return useQuery({
    queryKey: queryKeys.countries,
    queryFn: locationApi.listCountries,
    staleTime: Infinity, // countries never change
  });
}

export function useStatesQuery(countryId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.states(countryId ?? 0),
    queryFn: () => locationApi.listStates(countryId!),
    enabled: enabled && !!countryId,
    staleTime: Infinity,
  });
}

export function useCitiesQuery(stateId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cities(stateId ?? 0),
    queryFn: () => locationApi.listCities(stateId!),
    enabled: enabled && !!stateId,
    staleTime: Infinity,
  });
}

export function useBulkCreateContactsMutation() {
  return useMutation({
    mutationFn: (contacts: ContactPayload[]) => contactApi.bulkCreate(contacts),
  });
}

// ── Contact Group Queries ──────────────────────────────────────────

export function useContactGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.contactGroups,
    queryFn: groupApi.list,
    staleTime: 30_000,
  });
}

export function useContactGroupQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contactGroup(id),
    queryFn: () => groupApi.get(id),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateContactGroupMutation() {
  return useMutation({
    mutationFn: (data: ContactGroupPayload) => groupApi.create(data),
  });
}

export function useUpdateContactGroupMutation() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactGroupPayload> }) =>
      groupApi.update(id, data),
  });
}

export function useDeleteContactGroupMutation() {
  return useMutation({
    mutationFn: (id: string) => groupApi.delete(id),
  });
}

export function useAddGroupMembersMutation() {
  return useMutation({
    mutationFn: ({ id, contactIds }: { id: string; contactIds: string[] }) =>
      groupApi.addMembers(id, contactIds),
  });
}

export function useRemoveGroupMembersMutation() {
  return useMutation({
    mutationFn: ({ id, contactIds }: { id: string; contactIds: string[] }) =>
      groupApi.removeMembers(id, contactIds),
  });
}

export function useFilterContactsQuery(filters: FilterParams, enabled = true) {
  return useQuery({
    queryKey: ['contacts', 'filter', filters],
    queryFn: () => groupApi.filterContacts(filters),
    enabled,
    staleTime: 10_000,
  });
}

export function useBulkCreateWithGroupMutation() {
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      contacts: ContactPayload[];
    }) => groupApi.bulkCreateWithGroup(data),
  });
}

// ── API Key Queries ───────────────────────────────────────────────────

export const apiKeyQueryKeys = {
  all: ['api-keys'] as const,
  stats: ['api-keys', 'stats'] as const,
};

export function useApiKeysQuery() {
  return useQuery({
    queryKey: apiKeyQueryKeys.all,
    queryFn: apiKeysApi.list,
    staleTime: 30_000,
  });
}

export function useApiKeyStatsQuery() {
  return useQuery({
    queryKey: apiKeyQueryKeys.stats,
    queryFn: apiKeysApi.getStats,
    staleTime: 30_000,
  });
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApiKeyPayload) => apiKeysApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.stats });
    },
  });
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.stats });
    },
  });
}

export function useRevokeApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.stats });
    },
  });
}

// ── Campaign Queries ─────────────────────────────────────────────

export const campaignQueryKeys = {
  all: ['campaigns'] as const,
  list: (params?: Record<string, unknown>) => ['campaigns', 'list', params] as const,
  detail: (id: string) => ['campaigns', id] as const,
  recipients: (id: string, params?: Record<string, unknown>) => ['campaigns', id, 'recipients', params] as const,
  stats: ['campaigns', 'stats'] as const,
};

export function useCampaignsQuery(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: campaignQueryKeys.list(params as Record<string, unknown>),
    queryFn: () => campaignApi.list(params),
    staleTime: 10_000,
  });
}

export function useCampaignQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: campaignQueryKeys.detail(id),
    queryFn: () => campaignApi.get(id),
    enabled: enabled && !!id,
    staleTime: 10_000,
  });
}

export function useCampaignStatsQuery() {
  return useQuery({
    queryKey: campaignQueryKeys.stats,
    queryFn: campaignApi.getStats,
    staleTime: 30_000,
  });
}

export function useCampaignRecipientsQuery(
  id: string,
  params?: { status?: string; search?: string; page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: campaignQueryKeys.recipients(id, params as Record<string, unknown>),
    queryFn: () => campaignApi.getRecipients(id, params),
    enabled: enabled && !!id,
    staleTime: 5_000,
  });
}

export function useCreateCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CampaignPayload) => campaignApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats });
    },
  });
}

export function useUpdateCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampaignUpdatePayload }) =>
      campaignApi.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
    },
  });
}

export function useDeleteCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats });
    },
  });
}

export function useStartCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.start(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats });
    },
  });
}

export function usePauseCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.pause(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
    },
  });
}

export function useCancelCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.cancel(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats });
    },
  });
}

export function useResendFailedCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.resendFailed(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.recipients(id) });
      void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all });
    },
  });
}

// ── Message Queries ────────────────────────────────────────────────

export function useMessagesQuery(params?: {
  limit?: number;
  offset?: number;
  direction?: string;
  sessionId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['messages', params],
    queryFn: () => messageApi.list(params),
    staleTime: 10_000,
  });
}

// ── RBAC: Users, Roles & Permissions Queries ───────────────────────

export const userQueryKeys = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
};

export const roleQueryKeys = {
  all: ['roles'] as const,
  detail: (id: string) => ['roles', id] as const,
};

export const permissionQueryKeys = {
  all: ['permissions'] as const,
};

export function useUsersQuery() {
  return useQuery({
    queryKey: userQueryKeys.all,
    queryFn: userApi.list,
    staleTime: 15_000,
  });
}

export function useUserQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => userApi.get(id),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => userApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) => userApi.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useRolesQuery() {
  return useQuery({
    queryKey: roleQueryKeys.all,
    queryFn: roleApi.list,
    staleTime: 30_000,
  });
}

export function useRoleQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.detail(id),
    queryFn: () => roleApi.get(id),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRolePayload) => roleApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRolePayload }) => roleApi.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function usePermissionsQuery() {
  return useQuery({
    queryKey: permissionQueryKeys.all,
    queryFn: permissionApi.list,
    staleTime: Infinity,
  });
}

// ── Auth / Profile Queries ────────────────────────────────────────

export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: authApi.me,
    staleTime: 60_000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string; profilePic?: string }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
  });
}

// ── System Settings Queries ───────────────────────────────────────

export function useSystemSettingsQuery() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: systemSettingsApi.get,
    staleTime: 60_000,
  });
}

export function useUpdateSystemSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{
      businessLogo: string;
      smallLogo: string;
      email: string;
      altPhone: string;
      website: string;
      name: string;
      address: string;
      googleMapLink: string;
    }>) => systemSettingsApi.update(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}

// ── System Check ──────────────────────────────────────────────────────

export function useSystemCheckQuery(enabled = true) {
  return useQuery({
    queryKey: ['system-check'],
    queryFn: systemCheckApi.get,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

// ── Message Health ────────────────────────────────────────────────────

export function useMessageHealthQuery(enabled = true) {
  return useQuery({
    queryKey: ['message-health'],
    queryFn: messageHealthApi.get,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useTestSendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => messageHealthApi.testSend(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['message-health'] });
    },
  });
}
