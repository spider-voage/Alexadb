import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from './database';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails![0].value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          googleId: profile.id,
          emailVerified: true,
        }
      });
    }

    done(null, user);
  } catch (error) {
    done(error as Error, undefined);
  }
}));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: '/api/auth/github/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({ where: { githubId: profile.id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails![0].value,
          name: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
          githubId: profile.id,
          emailVerified: true,
        }
      });
    }

    done(null, user);
  } catch (error) {
    done(error as Error, undefined);
  }
}));

export { passport };
