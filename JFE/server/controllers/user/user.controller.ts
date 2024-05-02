import { Request, Response } from 'express';
import { User } from '../../models/user/user.model';

export const getUserProfile = async (req: Request, res: Response ) => {
  console.log('Session:', req.session);
  console.log('req.user:', req.user);
  console.log('Headers:', req.headers); 
    try {
          if (!req.user) {
              throw new Error('User session not found');
          }
        
        const user = await User.findById((req.user as { id: string }).id); 
        if (!user) {
            return res.status(404).send('User not found');
        }
        const userProfile = {
          email: user.email,
          role: user.role,
        };
        res.send(userProfile);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
};

export const createUser = async (req: Request, res: Response) => {
  try {  
    const { email } = req.body;
    const user = new User({
      email,
      pods:  [], // Default to an empty array 
    });

    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Function to retrieve all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}); 
        res.send(users);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
};
