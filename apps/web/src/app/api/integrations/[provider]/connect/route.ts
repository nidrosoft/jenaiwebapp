/**
 * Integration Connect API Route
 * GET /api/integrations/[provider]/connect - Initiate OAuth flow
 */

import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { badRequestResponse } from '@/lib/api/utils';

interface RouteParams {
  params: Promise<{ provider: string }>;
}

const OAUTH_CONFIGS: Record<string, { authUrl: string; scopes: string[] }> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Calendars.ReadWrite',
      'Mail.Read',
    ],
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    scopes: ['channels:read', 'chat:write', 'users:read'],
  },
  zoom: {
    authUrl: 'https://zoom.us/oauth/authorize',
    scopes: ['meeting:read', 'meeting:write', 'user:read'],
  },
};

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { provider } = await params;

  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    return badRequestResponse(`Unsupported provider: ${provider}`);
  }

  // Allow custom redirect URL via query param (for onboarding flow)
  const { searchParams } = new URL(request.url);
  const customRedirect = searchParams.get('redirect');
  const redirectUrl = customRedirect
    ? `${process.env.NEXT_PUBLIC_APP_URL}${customRedirect}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations`;

  // Build OAuth state
  const state = Buffer.from(
    JSON.stringify({
      provider,
      user_id: context.user.id,
      org_id: context.user.org_id,
      redirect_url: redirectUrl,
    })
  ).toString('base64');

  // Build OAuth URL
  const params_obj = new URLSearchParams();

  if (provider === 'google') {
    params_obj.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    params_obj.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!);
    params_obj.set('response_type', 'code');
    params_obj.set('scope', config.scopes.join(' '));
    params_obj.set('access_type', 'offline');
    params_obj.set('prompt', 'consent');
    params_obj.set('state', state);
  } else if (provider === 'microsoft') {
    params_obj.set('client_id', process.env.MICROSOFT_CLIENT_ID!);
    params_obj.set('redirect_uri', process.env.MICROSOFT_REDIRECT_URI!);
    params_obj.set('response_type', 'code');
    params_obj.set('scope', config.scopes.join(' '));
    params_obj.set('state', state);
  } else if (provider === 'slack') {
    params_obj.set('client_id', process.env.SLACK_CLIENT_ID!);
    params_obj.set('redirect_uri', process.env.SLACK_REDIRECT_URI!);
    params_obj.set('scope', config.scopes.join(','));
    params_obj.set('state', state);
  } else if (provider === 'zoom') {
    params_obj.set('client_id', process.env.ZOOM_CLIENT_ID!);
    params_obj.set('redirect_uri', process.env.ZOOM_REDIRECT_URI!);
    params_obj.set('response_type', 'code');
    params_obj.set('state', state);
  }

  const authUrl = `${config.authUrl}?${params_obj.toString()}`;

  return NextResponse.redirect(authUrl);
}

export async function GET(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleGet(req, ctx, routeParams))(request);
}
