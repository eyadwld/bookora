import Session from "../models/Session.js";
import User from "../models/User.js";

import { ApiError } from "../utils/ApiError.js";

import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  REVOKED_SESSION_RETENTION_MS,
} from "../utils/token-manager.js";

const GRACE_PERIOD_MS = 15 * 1000;

/* =========================================================
   HELPERS
========================================================= */

const getRevokedDeleteDate = (now = new Date(), expiresAt = null) => {
  const retentionDate = new Date(now.getTime() + REVOKED_SESSION_RETENTION_MS);

  if (expiresAt && expiresAt < retentionDate) {
    return expiresAt;
  }

  return retentionDate;
};

const revokeSessionDocument = async (session, now = new Date()) => {
  if (!session.revokedAt) {
    session.revokedAt = now;
  }

  session.deleteAt = getRevokedDeleteDate(now, session.expiresAt);

  await session.save();

  return session;
};

const revokeAllUserSessions = async (userId, now = new Date()) => {
  const sessions = await Session.find({
    userId,
    revokedAt: null,
  });

  for (const session of sessions) {
    await revokeSessionDocument(session, now);
  }
};

const getAccessToken = (session) =>
  createAccessToken(session.userId, session._id);

/* =========================================================
   CREATE SESSION
========================================================= */

export const createSessionService = async ({ userId, userAgent, ip }) => {
  const now = new Date();

  const refreshToken = createRefreshToken();

  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  const session = await Session.create({
    userId,

    refreshTokenHash: hashRefreshToken(refreshToken),

    expiresAt,

    // TTL cleanup
    deleteAt: expiresAt,

    userAgent,
    ip,

    lastUsedAt: now,
  });

  return {
    session,

    refreshToken,

    accessToken: getAccessToken(session),
  };
};

/* =========================================================
   REFRESH SESSION
========================================================= */

export const refreshSessionService = async ({
  refreshToken,
  userAgent,
  ip,
}) => {
  if (!refreshToken) {
    throw ApiError(401, "Refresh token not found");
  }

  const incomingHash = hashRefreshToken(refreshToken);

  const session = await Session.findOne({
    $or: [
      {
        refreshTokenHash: incomingHash,
      },
      {
        previousRefreshTokenHash: incomingHash,
      },
    ],
  });

  if (!session) {
    throw ApiError(401, "Invalid refresh token");
  }

  const now = new Date();

  /* -------------------------------------------------------
     REVOKED
  ------------------------------------------------------- */

  if (session.revokedAt) {
    await revokeAllUserSessions(session.userId, now);

    throw ApiError(401, "Session compromised. Please login again");
  }

  /* -------------------------------------------------------
     EXPIRED
  ------------------------------------------------------- */

  if (session.expiresAt <= now) {
    await revokeSessionDocument(session, now);

    throw ApiError(401, "Session expired. Please login again");
  }

  /* -------------------------------------------------------
     PREVIOUS TOKEN
  ------------------------------------------------------- */

  if (session.previousRefreshTokenHash === incomingHash) {
    const rotatedRecently =
      session.rotatedAt &&
      now.getTime() - new Date(session.rotatedAt).getTime() < GRACE_PERIOD_MS;

    if (rotatedRecently) {
      return {
        session,

        refreshToken: null,

        accessToken: getAccessToken(session),
      };
    }

    // Old refresh token reused after grace period.
    await revokeSessionDocument(session, now);

    await revokeAllUserSessions(session.userId, now);

    throw ApiError(401, "Session compromised. Please login again");
  }

  /* -------------------------------------------------------
     VERIFY USER
  ------------------------------------------------------- */

  const user = await User.findById(session.userId).select("+isActive");

  if (!user) {
    await revokeSessionDocument(session, now);

    throw ApiError(401, "User not found");
  }

  if (user.isActive === false) {
    await revokeSessionDocument(session, now);

    throw ApiError(
      403,
      "Your account is deactivated. Contact us for more details",
    );
  }

  /* -------------------------------------------------------
     ROTATE REFRESH TOKEN
  ------------------------------------------------------- */

  const newRefreshToken = createRefreshToken();

  const newHash = hashRefreshToken(newRefreshToken);

  const newExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  /*
   * Atomic race protection.
   * Only ONE request can change this
   * session from the old token to the
   * new token.
   */
  const result = await Session.updateOne(
    {
      _id: session._id,

      refreshTokenHash: incomingHash,

      revokedAt: null,
    },
    {
      $set: {
        previousRefreshTokenHash: incomingHash,

        refreshTokenHash: newHash,

        rotatedAt: now,

        lastUsedAt: now,

        expiresAt: newExpiresAt,

        deleteAt: newExpiresAt,

        ...(userAgent && {
          userAgent,
        }),

        ...(ip && {
          ip,
        }),
      },
    },
  );

  /* -------------------------------------------------------
     LOST REFRESH RACE
  ------------------------------------------------------- */

  if (result.modifiedCount !== 1) {
    const freshSession = await Session.findById(session._id);

    if (
      freshSession &&
      freshSession.previousRefreshTokenHash === incomingHash
    ) {
      return {
        session: freshSession,

        refreshToken: null,

        accessToken: getAccessToken(freshSession),
      };
    }

    throw ApiError(401, "Session compromised. Please login again");
  }

  /* -------------------------------------------------------
     RETURN NEW TOKENS
  ------------------------------------------------------- */

  session.previousRefreshTokenHash = incomingHash;

  session.refreshTokenHash = newHash;

  session.rotatedAt = now;

  session.lastUsedAt = now;

  session.expiresAt = newExpiresAt;

  session.deleteAt = newExpiresAt;

  if (userAgent) {
    session.userAgent = userAgent;
  }

  if (ip) {
    session.ip = ip;
  }

  return {
    session,

    refreshToken: newRefreshToken,

    accessToken: getAccessToken(session),
  };
};

/* =========================================================
   REVOKE BY REFRESH TOKEN
========================================================= */

export const revokeSessionByTokenService = async (refreshToken) => {
  if (!refreshToken) {
    return null;
  }

  const hash = hashRefreshToken(refreshToken);

  const session = await Session.findOne({
    $or: [
      {
        refreshTokenHash: hash,
      },
      {
        previousRefreshTokenHash: hash,
      },
    ],
  });

  if (!session) {
    return null;
  }

  await revokeSessionDocument(session);

  return session;
};

/* =========================================================
   REVOKE ONE SESSION
========================================================= */

export const revokeSessionService = async ({ userId, sessionId }) => {
  const session = await Session.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw ApiError(404, "Session not found");
  }

  await revokeSessionDocument(session);

  return session;
};

/* =========================================================
   REVOKE ALL SESSIONS
========================================================= */

export const revokeAllSessionsService = async (userId) => {
  await revokeAllUserSessions(userId);

  return true;
};

/* =========================================================
   GET ACTIVE SESSIONS
========================================================= */

export const getSessionsService = async (userId) => {
  return Session.find({
    userId,

    revokedAt: null,

    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      createdAt: -1,
    })
    .select("_id userAgent ip lastUsedAt createdAt")
    .lean();
};
