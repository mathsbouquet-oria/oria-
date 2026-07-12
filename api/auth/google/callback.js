import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Code manquant dans la réponse Google.');
  }
  if (!state) {
    return res.status(400).send('Utilisateur manquant (state).');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();

    if (tokens.error) {
      return res.status(400).send('Erreur Google: ' + tokens.error_description);
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileRes.json();

    const updateData = {
      user_id: state,
      provider: 'google',
      email: profile.email,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    };
    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token;
    }

    const { error } = await supabase
      .from('email_connections')
      .upsert(updateData, { onConflict: 'user_id,provider' });

    if (error) throw error;

    res.redirect('/dashboard.html?email_connected=1');
  } catch (err) {
    res.status(500).send('Erreur serveur: ' + err.message);
  }
}
