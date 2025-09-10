# Social Authentication Setup Guide

## Overview
This guide explains how to configure Google and Facebook OAuth authentication for the MarketGrow application.

## Supabase OAuth Configuration

### Prerequisites
1. Supabase project created and configured
2. Google Cloud Console account
3. Facebook for Developers account

### Google OAuth Setup

1. **Create Google OAuth Application**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to \"Credentials\" → \"Create Credentials\" → \"OAuth 2.0 Client IDs\"
   - Set application type to \"Web application\"
   - Add authorized redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback (for development)
     ```

2. **Configure in Supabase**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google Client ID and Client Secret
   - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### Facebook OAuth Setup

1. **Create Facebook App**
   - Go to [Facebook for Developers](https://developers.facebook.com/)
   - Create a new app for \"Consumer\"
   - Add \"Facebook Login\" product
   - Configure OAuth redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback (for development)
     ```

2. **Configure in Supabase**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Facebook provider
   - Add your Facebook App ID and App Secret
   - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

## Implementation Details

### OAuth Flow
1. User clicks social auth button (Google/Facebook)
2. UserAuthService.signInWithGoogle() or signInWithFacebook() is called
3. User is redirected to OAuth provider
4. After authentication, user is redirected to `/auth/callback`
5. AuthCallback component handles the response
6. UserAuthService.handleOAuthCallback() processes the result
7. User profile is created if it doesn't exist
8. User is redirected to appropriate dashboard based on role

### Role Assignment
- New OAuth users are automatically assigned 'user' role
- If no profile exists, one is created with user role
- Admin/Manager users are redirected to admin interface
- Regular users are redirected to user dashboard

### Error Handling
- OAuth failures redirect to login page with error message
- Network errors are handled gracefully
- Invalid tokens trigger re-authentication

## Testing OAuth Integration

### Development Setup
1. Ensure redirect URIs include localhost for development
2. Test both registration and login flows
3. Verify role assignment works correctly
4. Test error scenarios (cancelled auth, network issues)

### Production Deployment
1. Update redirect URIs to production domain
2. Ensure HTTPS is configured
3. Test OAuth flows in production environment
4. Monitor authentication metrics

## Security Considerations

### OAuth Security
- Always use HTTPS in production
- Validate OAuth tokens server-side
- Implement proper CSRF protection
- Use secure cookie settings

### User Data Privacy
- Only request necessary OAuth scopes
- Handle user consent properly
- Implement data deletion policies
- Follow OAuth provider guidelines

## Troubleshooting

### Common Issues
1. **Redirect URI Mismatch**: Ensure all redirect URIs are properly configured
2. **Invalid Client Credentials**: Verify Client ID/Secret are correct
3. **Scope Issues**: Check requested OAuth scopes
4. **CORS Errors**: Ensure proper CORS configuration

### Debug Steps
1. Check browser network tab for OAuth requests
2. Verify Supabase auth logs
3. Test OAuth flows in provider console
4. Check callback URL handling

## Environment Variables

Add these to your `.env.local` file for development:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Notes
- OAuth providers require HTTPS in production
- Test thoroughly before production deployment
- Monitor authentication success rates
- Keep OAuth credentials secure and rotate regularly