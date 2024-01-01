import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  authToken: string | null | undefined;
}

const userSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  authToken: { type: String, default: null },
});

// The auth middleware looks a user up by id *and* token on every request.
userSchema.index({ authToken: 1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
