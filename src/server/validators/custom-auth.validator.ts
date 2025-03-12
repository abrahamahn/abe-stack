import * as t from 'io-ts';

export const loginSchema = t.type({
  email: t.string,
  password: t.string
});

export const registerSchema = t.type({
  email: t.string,
  password: t.string,
  username: t.string,
  displayName: t.string
});

export const updateProfileSchema = t.type({
  username: t.string,
  bio: t.union([t.string, t.undefined]),
  avatar: t.union([t.string, t.undefined])
});

export const changePasswordSchema = t.type({
  currentPassword: t.string,
  newPassword: t.string
});

export const twoFactorVerifySchema = t.type({
  code: t.string
});

export const twoFactorEnableSchema = t.type({
  secret: t.string,
  code: t.string
}); 