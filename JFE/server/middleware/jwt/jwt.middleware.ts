import axios from 'axios';
import { User } from '../../models/user/user.model';
import { jwtDecode } from 'jwt-decode'; 
import {getConfigValue} from '../../util/config.utils'
export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', getConfigValue('CILOGON_CLIENT_ID'));
  params.append('client_secret', getConfigValue('CILOGON_CLIENT_SECRET'));
  params.append('code', code);
  params.append('redirect_uri', 'http://localhost:3000/auth/cilogon/callback' ); //TODO: for Prod Change this to the actual redirect URI
  params.append('scope', 'openid email profile');
  try {
    
    console.log('Exchanging code for token...');
      const response = await axios.post('https://cilogon.org/oauth2/token', params);
      console.log('Token Response:', response.data);
      const tokenData = response.data;
      const decodedToken: { email: string } = jwtDecode(tokenData.id_token);

      console.log('Decoded JWT:', decodedToken);
      try {
        const user = await User.create({ email: decodedToken.email });
        console.log('User from DB:', user);
      } catch (dbError) {
        console.error('Error handling user in DB:', dbError);
      }

    return tokenData; // Contains access_token, refresh_token, etc.
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

// Function to fetch user info using the access token
export async function getUserInfoFromToken(accessToken: string): Promise<{ email: string }> {
  try {
    const userInfoResponse = await axios.get('https://cilogon.org/oauth2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userInfo = userInfoResponse.data;
    console.log('UserInfo:', userInfo);

  
    if (userInfo && userInfo.email) {
      return { email: userInfo.email };
    } else {
      throw new Error('Email not found in user info');
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
}

