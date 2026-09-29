export type SmsMessageType = 'info' | 'ad';
export type SmsSettings = { configured: boolean; aligoUserId: string; apiKeyMasked: string | null; defaultSender: string; adDisplayName: string; moduleEnabled: boolean; realSendEnabled: boolean; providerMode: string; providerIsMock: boolean; providerMisconfigured: boolean; aligoTestMode: boolean; outboundServerIpHint: string; aligoApiSettingsUrl: string };
export type SmsSender = { id: number; senderNumber: string; label: string; status: string; isDefault: boolean };
export type SmsTemplate = { id: number; title: string; message: string; messageType: SmsMessageType };
export type SmsOptOut = { id: number; phoneMasked: string; reason: string | null };
export type SmsCampaign = { id: number; title: string; message: string; messageType: SmsMessageType; senderNumber: string; targetCount: number; successCount: number; failCount: number; skippedCount: number; status: string; scheduledAt: string | null; sentAt: string | null; createdAt: string };
