import { Request, Response } from 'express';
import { User, IUser} from '../../models/user/user.model';
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';
export const getUserRole = async (req: Request, res: Response ) => {

const accessToken  = req.cookies.token;
// console.log('Access Token:', accessToken);
if (!accessToken) {
  return res.status(400).json({ error: 'Access token is required' });
}
try {
  const { email } = await getUserInfoFromToken(accessToken as string);
  const user = await User.find({email});
  const role = user[0].role;
  res.json({ role }); 
  
} catch (error) {
  console.error('Failed to retrieve email:', error);
  res.status(500).json({ error: 'Failed to retrieve email' });
}
};
export const updateUserRole = async (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }
  try {
    const user = await User
      .findOneAndUpdate({ email }, {
        role
      }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to update user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

// Function to retrieve all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}); 
        res.send(users);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
};
// Function to delete a user
export const deleteUser = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        const user = await User.findOneAndDelete({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};