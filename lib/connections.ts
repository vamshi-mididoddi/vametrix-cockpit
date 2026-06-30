// Catalog of the external services a client (tenant) connects to go live.
// Credentials are stored row-per-key in the `tenant_credentials` table
// (service, credential_key, credential_value), matching get_tenant_credentials().
// This file holds ONLY field definitions — never secret values.

export interface ConnField {
  key: string;
  label: string;
  secret?: boolean;       // never prefilled/echoed back to the client
  placeholder?: string;
}

export interface ConnService {
  service: string;
  label: string;
  blurb: string;
  required?: boolean;     // needed for the client to function at all
  fields: ConnField[];
}

export const SERVICE_CATALOG: ConnService[] = [
  {
    service: 'meta_whatsapp',
    label: 'WhatsApp Cloud API',
    blurb: 'The number the AI qualifies leads on. Required.',
    required: true,
    fields: [
      { key: 'access_token', label: 'Access Token', secret: true },
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: 'e.g. 1234567890' },
      { key: 'waba_id', label: 'WhatsApp Business Account ID' },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token' },
    ],
  },
  {
    service: 'meta_ads',
    label: 'Meta Ads',
    blurb: 'Ad account the engine reads spend from and launches campaigns into. Required.',
    required: true,
    fields: [
      { key: 'access_token', label: 'System User Access Token', secret: true },
      { key: 'ad_account_id', label: 'Ad Account ID (no act_ prefix)', placeholder: '170153044' },
      { key: 'pixel_id', label: 'Pixel / Dataset ID' },
      { key: 'page_id', label: 'Facebook Page ID' },
    ],
  },
  {
    service: 'openrouter',
    label: 'AI / LLM (OpenRouter)',
    blurb: 'The brain. Powers qualification, the CEO, and creative. Required.',
    required: true,
    fields: [
      { key: 'api_key', label: 'API Key', secret: true },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://openrouter.ai/api/v1' },
      { key: 'default_model', label: 'Default Model', placeholder: 'google/gemini-2.5-flash' },
      { key: 'premium_model', label: 'Premium Model', placeholder: 'anthropic/claude-sonnet-4.6' },
    ],
  },
  {
    service: 'telegram',
    label: 'Telegram CEO Bot',
    blurb: 'Run the engine by chat + approve spend from your phone. Optional.',
    fields: [
      { key: 'bot_token', label: 'Bot Token', secret: true },
      { key: 'chat_id', label: 'Authorized Chat ID' },
      { key: 'webhook_secret', label: 'Webhook Secret' },
    ],
  },
  {
    service: 'n8n',
    label: 'n8n Engine',
    blurb: 'Workflow runtime that executes the agents. Optional per client.',
    fields: [
      { key: 'base_url', label: 'Base URL', placeholder: 'https://n8n.example.cloud' },
      { key: 'api_key', label: 'API Key', secret: true },
    ],
  },
];

// Which services must be connected before a client is considered "live".
export const REQUIRED_SERVICES = SERVICE_CATALOG.filter(s => s.required).map(s => s.service);
