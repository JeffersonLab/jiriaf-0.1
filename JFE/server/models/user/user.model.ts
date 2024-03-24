import mongoose, { Document, Model } from 'mongoose';

// User interface extending mongoose.Document
interface IUser extends Document {
  email: string;
  pods: string[];
  role: string;
}

//schema for the User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  pods: { type: [String], required: false, default: [] },
  role: { type: String, required: true, default: 'PENDING...' },
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


// Create the model from the schema
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export { User, IUser };
