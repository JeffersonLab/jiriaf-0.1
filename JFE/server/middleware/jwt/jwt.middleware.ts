import axios from 'axios';
import { User } from '../../models/user/user.model';
import { jwtDecode } from 'jwt-decode'; 
import jwt from 'jsonwebtoken';

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', process.env.CILOGON_CLIENT_ID as string);
  params.append('client_secret', process.env.CILOGON_CLIENT_SECRET as string);
  params.append('code', code);
  params.append('redirect_uri', process.env.CILOGON_CALLBACK_URL as string);
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

// export async function getEmailFromToken(token: string) {
//   const decodedToken: { email: string } = jwtDecode(token);
//   return decodedToken.email;
// }
// async function getPublicKey() {
//   // Example: Fetch the public key from CILogon or your auth server
//   const response = await axios.get('https://cilogon.org/path/to/public/key');
//   return response.data; // Adjust based on actual response structure
// }

// export async function verifyAccessToken(token: string): Promise<any> {
//   try {
//     // Optionally, fetch the public key from CILogon if you're verifying JWT signatures
//     const publicKey = await getPublicKey();

//     // Verify the token
//     const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }); // Adjust based on actual algorithm
//     return decoded;
//   } catch (error) {
//     console.error('Error verifying access token:', error);
//     throw error; // Or handle error as needed
//   }
// }