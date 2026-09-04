export class SecurityHttpError extends Error {
  readonly status: number;
  readonly publicMessage: string;
  readonly code: string;

  constructor(
    status: number,
    publicMessage: string,
    code: string,
  ) {
    super(publicMessage);
    this.name = "SecurityHttpError";
    this.status = status;
    this.publicMessage = publicMessage;
    this.code = code;
  }
}

type SessionLike = {
  user: {
    id: string;
    email?: string;
    role?: string;
    app_metadata?: { role?: unknown };
  };
  accessToken: string;
};

export function assertAuthenticatedSession<T extends SessionLike>(session: T | null | undefined): T {
  if (!session?.user?.id || !session.accessToken) {
    throw new SecurityHttpError(401, "Authentication required.", "AUTHENTICATION_REQUIRED");
  }

  return session;
}

export function assertAdminSession<T extends SessionLike>(session: T | null | undefined): T {
  const authenticated = assertAuthenticatedSession(session);
  const trustedRole = authenticated.user.app_metadata?.role ?? authenticated.user.role;
  if (trustedRole !== "admin") {
    throw new SecurityHttpError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }

  return authenticated;
}
