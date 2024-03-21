import { Request, Response } from 'express';
import { User } from '../../models/user/user.model';

export const getUserProfile = async (req: Request, res: Response ) => {
    try {
        const user = await User.findById((req.user as { id: string }).id); 
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.send(user);
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

