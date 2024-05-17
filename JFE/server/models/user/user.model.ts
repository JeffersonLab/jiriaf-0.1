// ./models/user/user.model.ts
import mongoose, { Document, Model } from 'mongoose';
const roles = ['admin', 'user', 'guest', 'PENDING...'];
// User interface extending mongoose.Document
interface IUser extends Document {
  email: string;
  pods: string[];
  role: string;
}
interface IUserModel extends Model<IUser> {
  findOrCreate: ({ email }: { email: string }) => Promise<IUser>;
  findOneByEmail: (email: string) => Promise<IUser | null>;
  build: (attrs: IUser) => IUser;
}

//schema for the User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  pods: { type: [String], required: false, default: [] },
  role: { type: String, required: true, default: 'PENDING...', enum: roles},
  
  
});

// Static methods for the User model
UserSchema.statics.findOrCreate = async function ({ email }): Promise<IUser> {
  let user = await this.findOne({ email }).exec();
  if (!user) {
    user = await this.create({ email, role: 'PENDING...' });
  }
  return user;
};

UserSchema.statics.findOneByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email }).exec();
};

// 
UserSchema.statics.build = function (attrs: IUser) {
  return new this(attrs);
};

UserSchema.index({ email: 1 });

// Create the model from the schema
// const User: Model<IUser> = mongoose.model<IUser, IUserModel>('User', UserSchema);
const User = mongoose.model<IUser, IUserModel>('User', UserSchema);
export { User, IUser };
